CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"provider_service_id" integer,
	"date" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"availability_id" integer,
	"status" text DEFAULT 'pending',
	"notes" text,
	"payment_method" text,
	"payment_status" text,
	"paymentid" varchar(64),
	"payment_id" text,
	"is_manually_created" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"service_name" text,
	"provider_name" text,
	"client_name" text,
	"client_phone" text,
	"total_price" integer
);
--> statement-breakpoint
CREATE TABLE "availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"is_available" boolean DEFAULT true,
	"date" text,
	"interval_minutes" integer DEFAULT 30
);
--> statement-breakpoint
CREATE TABLE "blocked_time_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"availability_id" integer NOT NULL,
	"date" text,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"reason" text,
	"blocked_by_user_id" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"color" text,
	"niche_id" integer NOT NULL,
	"parent_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_payment_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"prefer_credit_card" boolean DEFAULT true,
	"prefer_debit_card" boolean DEFAULT false,
	"prefer_pix" boolean DEFAULT false,
	"prefer_cash" boolean DEFAULT false,
	"default_card_id" text,
	"save_payment_info" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "client_payment_preferences_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "integrations_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"sendgrid_enabled" boolean DEFAULT false,
	"sendgrid_api_key" text,
	"push_notifications_enabled" boolean DEFAULT false,
	"vapid_public_key" text,
	"vapid_private_key" text,
	"whatsapp_enabled" boolean DEFAULT false,
	"whatsapp_api_key" text,
	"whatsapp_phone_number_id" text,
	"whatsapp_verify_token" text,
	"whatsapp_business_id" text,
	"whatsapp_chatbot_enabled" boolean DEFAULT false,
	"whatsapp_chatbot_welcome_message" text,
	"whatsapp_chatbot_scheduling_enabled" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "niches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'info',
	"read" boolean DEFAULT false,
	"link_to" text,
	"appointment_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "onboarding_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"user_type" text NOT NULL,
	"order" integer NOT NULL,
	"is_required" boolean DEFAULT true,
	"icon" text,
	"help_text" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"used_at" timestamp,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payment_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_fee_percentage" integer DEFAULT 175,
	"service_fee" integer DEFAULT 175,
	"min_service_fee" integer DEFAULT 100,
	"max_service_fee" integer DEFAULT 5000,
	"payout_schedule" text DEFAULT 'weekly',
	"stripe_enabled" boolean DEFAULT false,
	"stripe_live_mode" boolean DEFAULT false,
	"stripe_public_key" text,
	"stripe_secret_key" text,
	"stripe_webhook_secret" text,
	"stripe_connect_enabled" boolean DEFAULT false,
	"asaas_enabled" boolean DEFAULT false,
	"asaas_live_mode" boolean DEFAULT false,
	"asaas_api_key" text,
	"asaas_webhook_token" text,
	"asaas_wallet_id" text,
	"asaas_split_enabled" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "payment_withdrawals" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" text NOT NULL,
	"payment_method" text NOT NULL,
	"payment_details" jsonb,
	"requested_at" timestamp DEFAULT now(),
	"processed_at" timestamp,
	"transaction_id" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"discount_percentage" integer,
	"discount_value" integer,
	"service_id" integer,
	"provider_id" integer,
	"category_id" integer,
	"niche_id" integer,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"image" text,
	"coupon_code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"background_color" text,
	"text_color" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"balance" numeric(10, 2) DEFAULT '0',
	"available_balance" numeric(10, 2) DEFAULT '0',
	"pending_balance" numeric(10, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_breaks" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"name" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"is_recurring" boolean DEFAULT true,
	"date" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_payment_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"accepts_credit_card" boolean DEFAULT true,
	"accepts_debit_card" boolean DEFAULT true,
	"accepts_pix" boolean DEFAULT true,
	"accepts_cash" boolean DEFAULT true,
	"accepts_transfer" boolean DEFAULT false,
	"prefer_stripe" boolean DEFAULT true,
	"prefer_asaas" boolean DEFAULT false,
	"prefer_manual" boolean DEFAULT false,
	"auto_confirm" boolean DEFAULT false,
	"request_pre_payment" boolean DEFAULT false,
	"allow_partial_payment" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "provider_payment_preferences_provider_id_unique" UNIQUE("provider_id")
);
--> statement-breakpoint
CREATE TABLE "provider_service_fees" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"fixed_fee" integer DEFAULT 0 NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"execution_time" integer NOT NULL,
	"duration" integer NOT NULL,
	"price" integer NOT NULL,
	"break_time" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"stripe_account_id" text,
	"is_online" boolean DEFAULT false,
	"business_name" text,
	"description" text,
	"address" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"zip" text,
	"phone" text,
	"whatsapp" text,
	"email" text,
	"website" text,
	"instagram" text,
	"facebook" text,
	"cover_image" text,
	"latitude" text,
	"longitude" text,
	"business_hours" text,
	"specialties" text,
	"accepts_cards" boolean DEFAULT true,
	"accepts_pix" boolean DEFAULT true,
	"accepts_cash" boolean DEFAULT true,
	"accept_online_payments" boolean DEFAULT false,
	"merchant_code" text,
	"rating" integer,
	"rating_count" integer DEFAULT 0,
	"bio" text,
	"default_service_duration" integer DEFAULT 60,
	CONSTRAINT "provider_settings_provider_id_unique" UNIQUE("provider_id")
);
--> statement-breakpoint
CREATE TABLE "provider_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"appointment_id" integer,
	"created_at" timestamp DEFAULT now(),
	"description" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"appointment_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"published_at" timestamp DEFAULT now(),
	"is_public" boolean DEFAULT true,
	"provider_response" text,
	"status" text DEFAULT 'published' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category_id" integer NOT NULL,
	"niche_id" integer,
	"icon" text,
	"duration" integer DEFAULT 60,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"niche_id" integer,
	"name" text NOT NULL,
	"description" text,
	"price" integer DEFAULT 0,
	"duration" integer NOT NULL,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"user_id" integer,
	"admin_id" integer,
	"message" text NOT NULL,
	"attachment_url" text,
	"is_internal" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"read_by_user" boolean DEFAULT false,
	"read_by_admin" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"admin_id" integer,
	"subject" text NOT NULL,
	"category" text DEFAULT 'general',
	"priority" text DEFAULT 'normal',
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"last_response_at" timestamp,
	"read_by_user" boolean DEFAULT false,
	"read_by_admin" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"label" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "user_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text DEFAULT 'home' NOT NULL,
	"name" text NOT NULL,
	"street" text NOT NULL,
	"number" text NOT NULL,
	"complement" text,
	"neighborhood" text NOT NULL,
	"city" text NOT NULL,
	"state" text NOT NULL,
	"zip_code" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_onboarding_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"step_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_payment_methods" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"default_payment_method_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text,
	"profile_image" text,
	"user_type" text DEFAULT 'client' NOT NULL,
	"phone" text,
	"address" text,
	"is_active" boolean DEFAULT true,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"asaas_customer_id" varchar(64),
	"cpf" varchar(18) NOT NULL,
	"valor_taxa" double precision DEFAULT 1.75,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_withdrawals" ADD CONSTRAINT "payment_withdrawals_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_balances" ADD CONSTRAINT "provider_balances_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_service_fees" ADD CONSTRAINT "provider_service_fees_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_services" ADD CONSTRAINT "provider_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_transactions" ADD CONSTRAINT "provider_transactions_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_transactions" ADD CONSTRAINT "provider_transactions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_templates" ADD CONSTRAINT "service_templates_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_templates" ADD CONSTRAINT "service_templates_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_niche_id_niches_id_fk" FOREIGN KEY ("niche_id") REFERENCES "public"."niches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;