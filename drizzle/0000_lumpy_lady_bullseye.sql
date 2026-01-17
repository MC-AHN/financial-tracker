CREATE TABLE "transactions_financial_tracker" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"nominal" numeric(15, 2) NOT NULL,
	"transaction_date" timestamp NOT NULL,
	"status" varchar(10) NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "users_financial_tracker" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(256) NOT NULL,
	"password" varchar(256) NOT NULL,
	CONSTRAINT "users_financial_tracker_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "transactions_financial_tracker" ADD CONSTRAINT "transactions_financial_tracker_user_id_users_financial_tracker_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_financial_tracker"("id") ON DELETE no action ON UPDATE no action;