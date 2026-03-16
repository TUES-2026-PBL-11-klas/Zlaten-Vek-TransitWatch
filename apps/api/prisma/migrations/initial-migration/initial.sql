CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "google_id" TEXT,
    "credibility_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stops" (
    "id" TEXT NOT NULL,
    "line_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "stops_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "stop_id" TEXT NOT NULL,
    "category" TEXT NOT NULL CHECK ("category" IN ('vehicle_issue', 'traffic_issue', 'inspectors', 'safety_comfort', 'other')),
    "description" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'verified', 'hidden', 'expired')),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL CHECK ("type" IN ('confirm', 'dispute')),

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_followed_lines" (
    "user_id" TEXT NOT NULL,
    "line_id" TEXT NOT NULL,

    CONSTRAINT "user_followed_lines_pkey" PRIMARY KEY ("user_id","line_id")
);


-- indexes
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id") WHERE "google_id" IS NOT NULL;

CREATE UNIQUE INDEX "votes_report_id_user_id_key" ON "votes"("report_id", "user_id");

CREATE INDEX "reports_user_id_idx" ON "reports"("user_id");
CREATE INDEX "reports_stop_id_idx" ON "reports"("stop_id");


-- foreign keys
ALTER TABLE "stops" ADD CONSTRAINT "stops_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reports" ADD CONSTRAINT "reports_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- votes and notifications are owned by their parent report, so cascade on delete
ALTER TABLE "votes" ADD CONSTRAINT "votes_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_followed_lines" ADD CONSTRAINT "user_followed_lines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_followed_lines" ADD CONSTRAINT "user_followed_lines_line_id_fkey" FOREIGN KEY ("line_id") REFERENCES "lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
