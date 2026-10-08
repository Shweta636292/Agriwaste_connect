# AgriWaste Connect

A marketplace MVP connecting agricultural residue suppliers with industries that can reuse their materials.

## Run locally

Requirements: Node.js 20.19 or newer, npm, and a MongoDB instance (local or Atlas).

1. Copy `server/.env.example` to `server/.env`. Set `MONGO_URI` and replace `JWT_SECRET` with a long random value. `CLIENT_URL` should match the Vite origin.
2. Install dependencies with `npm --prefix server install` and `npm --prefix client install`.
3. Start the API in one terminal with `npm --prefix server run dev`.
4. Start the website in another terminal with `npm --prefix client run dev` and open the URL Vite prints (normally `http://localhost:5173`).

The client uses `http://localhost:5000/api` by default. Set `VITE_API_URL` in `client/.env` to override it.

### Administrator account

Admin registration is intentionally unavailable in the public UI. Add `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PHONE`, `ADMIN_PASSWORD` (at least 12 characters), and `ADMIN_LOCATION` to `server/.env`, then run `npm --prefix server run create-admin`. The script refuses to reuse an existing email and does not print the password. Remove the admin password from the environment file after the account is created.

## MVP features

- Farmer and industry registration, login, and JWT-authenticated sessions
- Farmer supply listings with quantity, unit, grade, location, availability date, price, notes, and optional photo URL
- Search and material filters for available listings
- Buyer purchase requests with quantity, offer, pickup date, and message
- Farmer accept, decline, or counter-offer; buyer can accept a counter-offer
- Accepted requests reserve listing quantity and appear as orders
- Both buyer and farmer confirm completion before an order is completed
- Buyers and farmers can save available listings to a private shortlist
- Each participant can leave one 1–5 star review after order completion; both sides can view trade feedback
- Admin overview, member list, and verification controls
- Role-based access and listing ownership checks on protected API actions

## API outline

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/listings`, `GET /api/listings/mine`, `POST /api/listings`
- `GET /api/listings/saved`, `PUT /api/listings/:id/saved`
- `PATCH /api/listings/:id`, `DELETE /api/listings/:id`
- `GET /api/requests`, `POST /api/requests`, `PATCH /api/requests/:id`
- `GET /api/requests/orders`, `PATCH /api/requests/:id/order-status`
- `GET /api/reviews/mine`, `GET /api/reviews/received`, `POST /api/reviews/:orderId`
- Admin-only `GET /api/admin/overview`, `GET /api/admin/users`, `PATCH /api/admin/users/:id/verify`

Payments, shipping integrations, secure document uploads, email/SMS notifications, password recovery, and dispute handling are not implemented. The current listing photo field accepts a URL; uploads should be added with a dedicated storage provider and file validation before production use. Environmental impact is not calculated or claimed by this MVP.
