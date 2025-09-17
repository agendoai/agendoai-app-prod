// Middleware para verificar se o usuário é administrador ou suporte
const isAdmin = (req: Request, res: Response, next: any) => {
	if (
		req.user &&
		(req.user.userType === "admin" || req.user.userType === "support")
	) {
		// Registrar acesso para auditoria
		console.log(
			`Usuário ${req.user.id} (${req.user.userType}) acessando rota de admin: ${req.path}`
		)
		return next()
	}
	return res.status(403).json({ error: "Permissão negada" })
}

// Middleware para verificar se o usuário é suporte ou admin
const isSupport = (req: Request, res: Response, next: any) => {
	if (
		req.user &&
		(req.user.userType === "support" || req.user.userType === "admin")
	) {
		// Registrar acesso para auditoria
		console.log(
			`Usuário ${req.user.id} (${req.user.userType}) acessando rota de suporte: ${req.path}`
		)
		return next()
	}
	return res.status(403).json({ error: "Permissão negada" })
}

// Middleware para verificar se o usuário é admin ou suporte
const isAdminOrSupport = (req: Request, res: Response, next: any) => {
	if (
		req.user &&
		(req.user.userType === "admin" ||
			(req.user.userType === "support" &&
				req.path.startsWith("/api/support/")))
	) {
		return next()
	}
	return res.status(403).json({ error: "Permissão negada" })
}