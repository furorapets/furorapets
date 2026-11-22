# Furora — Ethical Pet Relocation & Inventory Platform

Furora is an end-to-end platform for managing verified pet inventory, ethical breeder partner onboarding, customer ordering, 3-location custody tracking (Kennel Pickup → Vet Medical Clearance → Doorstep Handover), and official digital QR provenance certificates.

---

## 🚀 Tech Stack

* **Framework:** [Next.js 14](https://nextjs.org/) (App Router, React 18, TypeScript)
* **Database & ORM:** [Prisma ORM](https://www.prisma.io/) + [Turso Cloud Database](https://turso.tech/) (libSQL / SQLite engine)
* **Cloud Object Storage:** [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) (S3-compatible, zero egress fees)
* **Image Optimization:** [Sharp](https://sharp.pixelplumbing.com/) (WebP super-compression, 1600px auto-scaling, EXIF stripping)
* **Email System:** [Nodemailer](https://nodemailer.com/) with Hostinger SMTP (SSL / Port 465)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) & Lucide React Icons
* **Testing:** [Vitest](https://vitest.dev/)

---

## 🛠️ Environment Variables Setup

Copy `.env.example` to `.env` and populate your secrets:

```bash
cp .env.example .env
```

```env
# Database
DATABASE_URL="file:./dev.db"
TURSO_DATABASE_URL="libsql://<your-db-subdomain>.turso.io"
TURSO_AUTH_TOKEN="<your-turso-jwt-token>"

# Cloudflare R2
CLOUDFLARE_ACCOUNT_ID="<your-account-id>"
CLOUDFLARE_R2_ACCESS_KEY_ID="<your-access-key-id>"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="<your-secret-access-key>"
CLOUDFLARE_R2_BUCKET_NAME="furorapetsbucket"
CLOUDFLARE_R2_PUBLIC_DOMAIN="https://pub-<your-id>.r2.dev"

# Hostinger SMTP
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="breeder@furora.in"
SMTP_PASS="<your-smtp-password>"
SMTP_FROM="Furora Partner Network <breeder@furora.in>"
```

---

## 📦 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Push schema to Turso / seed initial catalog
npm run db:push
npm run db:seed

# 3. Start local development server
npm run dev

# 4. Production build
npm run build
```

---

## 🔑 Key Portals & Workflows

| Portal / Route | Role | Description |
| :--- | :--- | :--- |
| `/` | Public | Main landing portal & order tracking gateway |
| `/partner/onboard` | Breeders | Swiggy/Zomato style onboarding landing page & multi-step document wizard |
| `/admin/inventory` | Admin | Comprehensive 11-status pet inventory lifecycle & ownership transfer |
| `/admin/vendors` | Admin | Breeder application review, approval & itemized document flagging |
| `/admin/users` | Admin | Encrypted staff credential vault (Sales, Agents, Admins) |
| `/admin/categories` | Admin | Top-level categories & breed management |
| `/agent/order` | Ops Agent | Scoped single-order pickup inspection & proof of delivery (POD) |
| `/records/[orderId]` | Customer | Swiggy/Zomato style live 3-location tracking & verified records |
| `/certificate/[orderId]`| Customer | Official printable Furora Digital Provenance Certificate with QR |
