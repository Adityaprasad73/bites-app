# Bites — Food Delivery MVP

A simplified Zomato-style food delivery app 

## What's in here

**Three roles, three flows, one codebase.**

- **Customers** — browse restaurants, view menus, add to cart, checkout, watch their order's status update live.
- **Restaurant owners** — see incoming orders, accept/reject, mark as preparing → ready for pickup.
- **Delivery partners** — see orders ready for pickup, claim them, mark as out for delivery → delivered.

All status updates fan out in real time via Socket.io to everyone watching the order.

### Stack

- **Backend**: Node.js, Express, MongoDB (via Mongoose), Socket.io, JWT auth, bcrypt
- **Frontend**: React 18, Vite, React Router, Tailwind CSS, socket.io-client
- **No external services required** other than MongoDB.

### Order lifecycle

```
placed → accepted → preparing → ready_for_pickup → out_for_delivery → delivered
   ↓         ↓
cancelled ←──┘
```

Each transition is authorized by role:
- `placed → accepted/preparing/ready_for_pickup` — restaurant owner
- `ready_for_pickup → out_for_delivery → delivered` — assigned delivery partner
- `placed → cancelled` — customer (only while still placed)

## Getting started

### 1. Prerequisites

- Node.js 18+
- MongoDB running locally on port 27017 (or set `MONGO_URI`)

### 2. Backend

```bash
cd server
npm install
cp .env.example .env       # edit JWT_SECRET if you like
npm run seed               # populate demo restaurants + users
npm run dev                # starts on http://localhost:4000
```

### 3. Frontend

```bash
cd client
npm install
npm run dev                # starts on http://localhost:5173
```

Open http://localhost:5173.

### 4. Try it out

The seed creates three demo accounts (password is `password` for all):

| Email | Role |
| --- | --- |
| `customer@demo.com` | Customer |
| `owner@demo.com` | Restaurant owner (owns all 4 demo restaurants) |
| `partner@demo.com` | Delivery partner |

**The fun way to test the live flow:** open the app in three browser windows (or a normal window + two incognito windows) and sign in as each role.

1. Customer: browse → restaurant → add items → cart → place order
2. Owner: see the order appear instantly in the dashboard → click "Accept order" → "Start preparing" → "Ready for pickup"
3. Partner: order appears in "Available pickups" → "Accept pickup" → "Picked up — start delivery" → "Mark delivered"

The customer's tracking page updates live at every step.

## Project structure

```
zomato-mvp/
├── server/
│   └── src/
│       ├── index.js            # Express + Socket.io entry
│       ├── config/db.js
│       ├── models/             # User, Restaurant, MenuItem, Order
│       ├── routes/             # auth, restaurants, orders
│       ├── middleware/auth.js  # JWT + role guards
│       ├── sockets/index.js    # Socket.io rooms + emit helper
│       └── seed/seed.js
└── client/
    └── src/
        ├── main.jsx, App.jsx
        ├── api/client.js       # fetch wrapper
        ├── context/            # AuthContext, CartContext
        ├── hooks/useSocket.js
        ├── components/         # Navbar, StatusBadge, ProtectedRoute
        └── pages/              # Home, Restaurant, Cart, Login, Register,
                                #  OrderTrack, MyOrders, OwnerDashboard,
                                #  DeliveryDashboard
```

## What's intentionally NOT here (vs. the video)

To keep this a buildable MVP, these were left out:

- **Microservices** — everything's a single Express app. The route files (`auth.js`, `restaurants.js`, `orders.js`) are organized so you could split each into its own service later.
- **RabbitMQ** — we don't have a message broker; `emitOrderUpdate()` is the in-process equivalent. To extract: replace direct calls with `channel.publish(...)` and have other services consume.
- **Maps / live GPS tracking** — the tracking page shows status stages, not a moving dot on a map. To add: integrate Mapbox or Google Maps in `OrderTrack.jsx`, and have the delivery partner's client emit periodic `location:update` socket events.
- **Payments** — orders are cash-on-delivery only. To add: integrate Razorpay/Stripe before the `placeOrder` call.
- **Image upload** — restaurants/menu items reference image URLs. To add: an `/api/upload` route with multer + S3 or local storage.
- **Email/SMS notifications** — no Twilio/SendGrid integration.
- **Search by location / geo radius** — restaurant search is plain text only. To add: store `location` as `[lng, lat]` with a `2dsphere` index on the Restaurant model.

## Extending it

Some natural next steps:

1. **Add menu management UI** for restaurant owners (the API already supports it via `POST /api/restaurants/:id/menu`).
2. **Add reviews & ratings** — new `Review` model linked to Order + Restaurant.
3. **Add coupons / promo codes** — apply discount in `placeOrder`.
4. **Promote to microservices** — start by extracting the order service. Use the same MongoDB but a separate Express app, then introduce RabbitMQ between auth/orders/notifications.

## License

Do whatever you want with it.
