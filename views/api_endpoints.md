# ERP Backend API Endpoints

This document lists all the API endpoints defined in your Node.js backend.

## Core API Routes (`/api`)
Defined in `server/index.ts`.

### Authentication & Users
- `POST /api/auth/login`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/roles`
- `POST /api/roles`
- `PUT /api/roles/:id`

### Master Data
- `GET /api/currencies`
- `POST /api/currencies`
- `PUT /api/currencies/:code`
- `DELETE /api/currencies/:code`
- `GET /api/exchange-rates`
- `POST /api/exchange-rates`
- `PUT /api/exchange-rates/:id`
- `DELETE /api/exchange-rates/:id`
- `GET /api/divisions`
- `POST /api/divisions`
- `DELETE /api/divisions/:id`
- `GET /api/units`
- `POST /api/units`
- `PUT /api/units/:id`
- `DELETE /api/units/:id`
- `GET /api/item-categories`
- `POST /api/item-categories`
- `PUT /api/item-categories/:id`
- `DELETE /api/item-categories/:id`

### Items & Inventory
- `GET /api/items`
- `GET /api/items/:id`
- `POST /api/items`
- `PUT /api/items/:id`
- `DELETE /api/items/:id`
- `GET /api/items/:id/locations`
- `GET /api/items/:id/allocations`
- `GET /api/inventory-unit-costs`
- `POST /api/inventory-unit-costs`
- `PUT /api/inventory-unit-costs/:id`
- `DELETE /api/inventory-unit-costs/:id`
- `POST /api/inventory-unit-costs/bulk`

### Customers & Sales
- `GET /api/customers`
- `GET /api/customers/:id`
- `POST /api/customers`
- `PUT /api/customers/:id`
- `GET /api/customers/:id/transactions`
- `GET /api/invoices`
- `GET /api/invoices/:id`

### Utilities
- `GET /api/test-patch-route`
- `GET /api/ping`
- `GET /api/test-db`
- `GET /` (Root Endpoint)

---

## Procurement API Routes (`/api/procurement`)
Defined in `server/procurement.ts`.

### Shipment & Landed Costs
- `GET /api/procurement/shipments`
- `POST /api/procurement/shipments`
- `GET /api/procurement/shipments/:ref`
- `PUT /api/procurement/shipments/:id`
- `POST /api/procurement/save-landed-costs`
- `GET /api/procurement/costing-report`

### Procurement Planning
- `GET /api/procurement/plans`
- `POST /api/procurement/plans`
- `PUT /api/procurement/plans/:id/approve`
- `POST /api/procurement/plans/:id/generate-enquiries`
- `GET /api/procurement/plans/:id/export`
- `POST /api/procurement/plans/export-draft`
- `GET /api/procurement/planning`

### Suppliers & Quotations
- `GET /api/procurement/suppliers/:id/mappings`
- `POST /api/procurement/suppliers/:id/mappings`
- `DELETE /api/procurement/suppliers/:id/mappings`
- `PUT /api/procurement/suppliers/:id/lead-time`
- `GET /api/procurement/quote-analysis`

### Purchases & Pricing
- `POST /api/procurement/purchase-orders/:id/costs-and-payments`
- `GET /api/procurement/historical-prices/:itemId`

### Other Tools
- `GET /api/procurement/plans-test`
- `POST /api/procurement/attachments`
