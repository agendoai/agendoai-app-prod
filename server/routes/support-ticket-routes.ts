import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { eq, and, desc, asc, isNull, like, sql } from "drizzle-orm";
import { users, supportTickets, supportMessages, insertSupportTicketSchema, insertSupportMessageSchema } from "@shared/schema";
// Middleware para verificação de admin
const adminGuard = (req: any, res: any, next: any) => {
  if (req.user && req.user.userType === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Acesso não autorizado. Apenas administradores podem acessar este recurso.' });
};

// Esquema de validação para criação de ticket
const createTicketSchema = z.object({
  userId: z.number(),
  subject: z.string().min(3, "Assunto deve ter pelo menos 3 caracteres"),
  message: z.string().min(3, "Mensagem deve ter pelo menos 3 caracteres"),
  category: z.string().default("general"),
  priority: z.string().default("normal"),
});

// Esquema de validação para atualização de ticket
const updateTicketSchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  adminId: z.number().nullable().optional(),
  category: z.string().optional(),
});

// Esquema de validação para resposta ao ticket
const replyToTicketSchema = z.object({
  message: z.string().min(1, "Mensagem não pode estar vazia"),
  isInternal: z.boolean().default(false),
  attachmentUrl: z.string().optional(),
});

export const supportTicketRoutes = Router();

// Middleware para verificar se o admin tem permissão
supportTicketRoutes.use(adminGuard);

// Listar tickets baseado em filtros
supportTicketRoutes.get("/tickets", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const priority = req.query.priority as string | undefined;
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const userId = req.query.userId ? Number(req.query.userId) : undefined;
    
    // Construindo consulta com filtros
    let conditions = [];
    
    if (status) {
      conditions.push(eq(supportTickets.status, status));
    }
    
    if (priority) {
      conditions.push(eq(supportTickets.priority, priority));
    }
    
    if (category) {
      conditions.push(eq(supportTickets.category, category));
    }
    
    if (userId) {
      conditions.push(eq(supportTickets.userId, userId));
    }
    
    if (search) {
      conditions.push(sql`${supportTickets.subject} ILIKE ${'%' + search + '%'}`);
    }
    
    // Executar a consulta com condições combinadas
    const query = db
      .select({
        ticket: supportTickets,
        user: users
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id));
      
    // Aplicar where apenas se houver condições
    const queryWithConditions = conditions.length > 0
      ? query.where(and(...conditions))
      : query;
      
    // Ordenar resultados
    const results = await queryWithConditions.orderBy(desc(supportTickets.updatedAt));
    
    // Transformar resultados para formato esperado pelo frontend
    const tickets = results.map(result => ({
      ...result.ticket,
      user: result.user
    }));
    
    res.json(tickets);
  } catch (error: any) {
    console.error("Erro ao listar tickets:", error);
    res.status(500).json({ error: error.message });
  }
});

// Obter ticket específico com mensagens
supportTicketRoutes.get("/ticket/:id", async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    
    // Buscar ticket com informações do usuário
    const [ticketResult] = await db
      .select({
        ticket: supportTickets,
        user: users
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .where(eq(supportTickets.id, ticketId));
    
    if (!ticketResult) {
      return res.status(404).json({ error: "Ticket não encontrado" });
    }
    
    // Buscar mensagens do ticket
    const messages = await db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.ticketId, ticketId))
      .orderBy(asc(supportMessages.createdAt));
    
    // Combinar ticket com mensagens
    const ticket = {
      ...ticketResult.ticket,
      user: ticketResult.user,
      messages
    };
    
    // Marcar ticket como lido pelo admin
    if (!ticketResult.ticket.readByAdmin) {
      await db
        .update(supportTickets)
        .set({ 
          readByAdmin: true,
          updatedAt: new Date()
        })
        .where(eq(supportTickets.id, ticketId));
    }
    
    res.json(ticket);
  } catch (error: any) {
    console.error("Erro ao buscar ticket:", error);
    res.status(500).json({ error: error.message });
  }
});

// Criar novo ticket
supportTicketRoutes.post("/ticket", async (req, res) => {
  try {
    const validation = createTicketSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.message });
    }
    
    const { userId, subject, message, category, priority } = validation.data;
    
    // Verificar se usuário existe
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    
    // Obter ID do admin atual
    const adminId = 1; // Idealmente obtido da sessão do admin
    
    // Iniciar transação para garantir que tanto o ticket quanto a mensagem inicial sejam criados
    const result = await db.transaction(async (tx) => {
      // Criar ticket
      const [ticket] = await tx
        .insert(supportTickets)
        .values({
          userId,
          adminId,
          subject,
          category,
          priority,
          status: "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      
      // Criar mensagem inicial
      const [ticketMessage] = await tx
        .insert(supportMessages)
        .values({
          ticketId: ticket.id,
          userId, // Mensagem do usuário
          adminId: null,
          message,
          createdAt: new Date(),
          isInternal: false,
          readByAdmin: true,
          readByUser: false
        })
        .returning();
      
      return { ticket, ticketMessage, user };
    });
    
    res.status(201).json({ 
      ...result.ticket, 
      user: result.user, 
      messages: [result.ticketMessage] 
    });
  } catch (error: any) {
    console.error("Erro ao criar ticket:", error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar ticket (status, prioridade, admin responsável)
supportTicketRoutes.put("/ticket/:id", async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const validation = updateTicketSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.message });
    }
    
    const updates = validation.data;
    
    // Verificar se o ticket existe
    const [existingTicket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId));
    
    if (!existingTicket) {
      return res.status(404).json({ error: "Ticket não encontrado" });
    }
    
    // Se estiver marcando como resolvido, adicionar data de resolução
    let updatesData = { ...updates };
    if (updatesData.status === "resolved" && existingTicket.status !== "resolved") {
      // Adicionar campo resolvedAt
      updatesData = {
        ...updatesData,
        resolvedAt: new Date()
      };
    }
    
    // Atualizar o ticket com tipagem correta
    let updateData: any = {
      ...updatesData,
      updatedAt: new Date()
    };
    
    // Atualizar o ticket
    const [updatedTicket] = await db
      .update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, ticketId))
      .returning();
    
    // Se o admin está assumindo o ticket (mudança de status para in-progress), adicionar mensagem automática
    if (updates.status === "in-progress" && existingTicket.status === "pending" && updates.adminId) {
      await db
        .insert(supportMessages)
        .values({
          ticketId,
          userId: null,
          adminId: updates.adminId,
          message: "Um administrador está analisando seu ticket.",
          isInternal: false,
          createdAt: new Date(),
          readByAdmin: true,
          readByUser: false
        });
    }
    
    // Se o ticket foi resolvido, adicionar mensagem automática
    if (updates.status === "resolved" && existingTicket.status !== "resolved") {
      await db
        .insert(supportMessages)
        .values({
          ticketId,
          userId: null,
          adminId: existingTicket.adminId || updates.adminId,
          message: "Este ticket foi marcado como resolvido. Por favor, confirme se sua questão foi solucionada.",
          isInternal: false,
          createdAt: new Date(),
          readByAdmin: true,
          readByUser: false
        });
    }
    
    // Buscar o usuário para retornar junto com o ticket
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, updatedTicket.userId));
    
    res.json({ ...updatedTicket, user });
  } catch (error: any) {
    console.error("Erro ao atualizar ticket:", error);
    res.status(500).json({ error: error.message });
  }
});

// Responder a um ticket
supportTicketRoutes.post("/ticket/:id/reply", async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const validation = replyToTicketSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.message });
    }
    
    const { message, isInternal, attachmentUrl } = validation.data;
    
    // Verificar se o ticket existe
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId));
    
    if (!ticket) {
      return res.status(404).json({ error: "Ticket não encontrado" });
    }
    
    // Obter ID do admin atual
    const adminId = 1; // Idealmente obtido da sessão do admin
    
    // Criar nova mensagem
    const [newMessage] = await db
      .insert(supportMessages)
      .values({
        ticketId,
        userId: null, // Não é do usuário
        adminId, // É do admin
        message,
        attachmentUrl: attachmentUrl || null,
        isInternal,
        createdAt: new Date(),
        readByAdmin: true, // Já lida pelo admin que está respondendo
        readByUser: false // Não lida pelo usuário
      })
      .returning();
      
    // Se não for uma nota interna, atualizar o ticket com a hora da última resposta
    if (!isInternal) {
      await db
        .update(supportTickets)
        .set({ 
          lastResponseAt: new Date(),
          status: ticket.status === "pending" ? "in-progress" : ticket.status,
          adminId: ticket.adminId || adminId, // Atribuir ao admin atual se não tiver admin
          updatedAt: new Date(),
          readByUser: false // Marcar como não lido pelo usuário
        })
        .where(eq(supportTickets.id, ticketId));
    }
    
    res.json(newMessage);
  } catch (error: any) {
    console.error("Erro ao responder ticket:", error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar mensagens de um ticket
supportTicketRoutes.get("/ticket/:id/messages", async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    
    // Verificar se o ticket existe
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId));
    
    if (!ticket) {
      return res.status(404).json({ error: "Ticket não encontrado" });
    }
    
    // Buscar mensagens
    const messages = await db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.ticketId, ticketId))
      .orderBy(asc(supportMessages.createdAt));
    
    res.json(messages);
  } catch (error: any) {
    console.error("Erro ao buscar mensagens do ticket:", error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar estatísticas de suporte
supportTicketRoutes.get("/stats", async (req, res) => {
  try {
    // Contar tickets por status
    const ticketsByStatus = await db
      .select({
        status: supportTickets.status,
        count: sql<number>`count(*)`,
      })
      .from(supportTickets)
      .groupBy(supportTickets.status);
    
    // Contar tickets por prioridade
    const ticketsByPriority = await db
      .select({
        priority: supportTickets.priority,
        count: sql<number>`count(*)`,
      })
      .from(supportTickets)
      .groupBy(supportTickets.priority);
    
    // Contar tickets por categoria
    const ticketsByCategory = await db
      .select({
        category: supportTickets.category,
        count: sql<number>`count(*)`,
      })
      .from(supportTickets)
      .groupBy(supportTickets.category);
    
    // Tempo médio de resolução
    const avgResolutionTime = await db
      .select({
        avgTime: sql<number>`avg(extract(epoch from (${supportTickets.resolvedAt}::timestamp - ${supportTickets.createdAt}::timestamp)))`
      })
      .from(supportTickets)
      .where(and(
        eq(supportTickets.status, "resolved"),
        sql`${supportTickets.resolvedAt} IS NOT NULL`
      ));
    
    res.json({
      ticketsByStatus,
      ticketsByPriority,
      ticketsByCategory,
      avgResolutionTime: avgResolutionTime[0]?.avgTime
    });
  } catch (error: any) {
    console.error("Erro ao buscar estatísticas de suporte:", error);
    res.status(500).json({ error: error.message });
  }
});