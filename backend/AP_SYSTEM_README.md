# Normalized Payables System (Oracle E-Business Suite R12 Model)

## Overview

This document describes the fully normalized Payables system that follows Oracle E-Business Suite R12 standards. The system has been refactored from a flat table structure to a normalized, scalable database design with proper foreign key relationships, comprehensive indexing, and Oracle-compatible naming conventions.

## Architecture

### Database Schema

The normalized Payables system consists of the following core tables:

#### 1. **ap_suppliers** - Supplier Master Data
- **Primary Key**: `supplier_id` (BIGINT)
- **Key Fields**: `supplier_number`, `supplier_name`, `supplier_type`
- **Relationships**: One-to-many with `ap_supplier_sites`
- **Indexes**: `supplier_number`, `supplier_name`, `supplier_type`, `status`

#### 2. **ap_supplier_sites** - Supplier Locations
- **Primary Key**: `site_id` (BIGINT)
- **Foreign Key**: `supplier_id` → `ap_suppliers.supplier_id`
- **Key Fields**: `site_name`, `site_type`, `is_primary`
- **Relationships**: Many-to-one with `ap_suppliers`
- **Indexes**: `supplier_id`, `site_type`, `is_primary`

#### 3. **ap_invoices** - Invoice Headers
- **Primary Key**: `invoice_id` (BIGINT)
- **Foreign Keys**: 
  - `supplier_id` → `ap_suppliers.supplier_id`
  - `pay_to_site_id` → `ap_supplier_sites.site_id`
- **Key Fields**: `invoice_number`, `invoice_date`, `due_date`, `total_amount`
- **Generated Columns**: `amount_due` = `total_amount - amount_paid`
- **Relationships**: One-to-many with `ap_invoice_lines`
- **Indexes**: `invoice_number`, `supplier_id`, `due_date`, `status`, `amount_due`

#### 4. **ap_invoice_lines** - Invoice Line Items
- **Primary Key**: `line_id` (BIGINT)
- **Foreign Key**: `invoice_id` → `ap_invoices.invoice_id`
- **Key Fields**: `line_number`, `item_name`, `quantity`, `unit_price`
- **Generated Columns**: `total_line_amount` = `line_amount + tax_amount`
- **Relationships**: Many-to-one with `ap_invoices`
- **Indexes**: `invoice_id`, `line_number`, `item_code`
- **Unique Constraint**: `(invoice_id, line_number)`

#### 5. **ap_payments** - Payment Headers
- **Primary Key**: `payment_id` (BIGINT)
- **Foreign Key**: `supplier_id` → `ap_suppliers.supplier_id`
- **Key Fields**: `payment_number`, `payment_date`, `total_amount`
- **Generated Columns**: `amount_unapplied` = `total_amount - amount_applied`
- **Relationships**: One-to-many with `ap_payment_applications`
- **Indexes**: `payment_number`, `supplier_id`, `payment_date`, `status`

#### 6. **ap_payment_applications** - Payment-to-Invoice Applications
- **Primary Key**: `application_id` (BIGINT)
- **Foreign Keys**:
  - `payment_id` → `ap_payments.payment_id`
  - `invoice_id` → `ap_invoices.invoice_id`
- **Key Fields**: `applied_amount`, `applied_date`, `status`
- **Relationships**: Many-to-one with both `ap_payments` and `ap_invoices`
- **Indexes**: `payment_id`, `invoice_id`, `applied_date`, `status`

### Sequence Management

The system uses a centralized sequence management approach:

```sql
-- Sequence table structure
CREATE TABLE ar_sequences (
    sequence_name VARCHAR(50) PRIMARY KEY,
    current_value BIGINT DEFAULT 1,
    increment_by INT DEFAULT 1,
    min_value BIGINT DEFAULT 1,
    max_value BIGINT DEFAULT 999999999999,
    cycle BOOLEAN DEFAULT FALSE
);
```

**AP Sequences**:
- `AP_SUPPLIER_ID_SEQ` - Supplier ID generation
- `AP_SUPPLIER_SITE_ID_SEQ` - Supplier site ID generation
- `AP_INVOICE_ID_SEQ` - Invoice ID generation
- `AP_INVOICE_LINE_ID_SEQ` - Invoice line ID generation
- `AP_PAYMENT_ID_SEQ` - Payment ID generation
- `AP_PAYMENT_APPLICATION_ID_SEQ` - Payment application ID generation

## API Endpoints

### Suppliers (`/api/ap/suppliers`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all suppliers with summary data |
| GET | `/:id` | Get supplier by ID with sites |
| POST | `/` | Create new supplier |
| PUT | `/:id` | Update supplier |
| DELETE | `/:id` | Soft delete supplier |
| GET | `/:id/sites` | Get supplier sites |
| POST | `/:id/sites` | Add supplier site |

### Invoices (`/api/ap/invoices`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all invoices with filtering |
| GET | `/:id` | Get invoice by ID with lines and payments |
| POST | `/` | Create new invoice |
| PUT | `/:id` | Update invoice |
| PATCH | `/:id/status` | Update invoice status |
| DELETE | `/:id` | Soft delete invoice |
| GET | `/:id/lines` | Get invoice line items |
| GET | `/:id/payments` | Get invoice payment applications |

### Payments (`/api/ap/payments`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all payments with filtering |
| GET | `/:id` | Get payment by ID with applications |
| POST | `/` | Create new payment |
| PUT | `/:id` | Update payment |
| PATCH | `/:id/status` | Update payment status |
| DELETE | `/:id` | Soft delete payment |
| GET | `/:id/applications` | Get payment applications |
| POST | `/:id/applications` | Add payment application |

## Data Migration

### Migration Script

The system includes a comprehensive migration script (`migrate-payables-to-normalized.sql`) that:

1. **Migrates Suppliers**: Extracts unique vendors from `vendor_invoices` table
2. **Creates Supplier Sites**: Generates default payment sites for each supplier
3. **Migrates Invoices**: Converts flat invoice structure to normalized format
4. **Parses Line Items**: Extracts JSON line items into separate `ap_invoice_lines` table
5. **Migrates Payments**: Converts flat payment structure to normalized format
6. **Creates Applications**: Links payments to invoices through `ap_payment_applications`

### Migration Process

```bash
# Run migration script
mysql -u username -p database_name < migrate-payables-to-normalized.sql

# Or execute via Node.js
node -e "import('./migrate-payables-to-normalized.sql')"
```

## Setup and Installation

### 1. Database Setup

```bash
# Apply schema changes
mysql -u username -p database_name < database/schema.sql
```

### 2. Initialize AP System

```bash
# Run setup script
node backend/setup-ap-system.js
```

### 3. Verify Installation

```bash
# Check sequences
curl http://localhost:5000/api/ap/suppliers

# Check sample data
curl http://localhost:5000/api/ap/invoices
```

## Key Features

### 1. **Data Integrity**
- Foreign key constraints enforce referential integrity
- Generated columns ensure calculated values are always accurate
- Soft deletes preserve data history
- Transaction safety with rollback on errors

### 2. **Performance Optimization**
- Comprehensive indexing on critical columns
- Optimized queries with proper JOINs
- Sequence-based ID generation for scalability
- Efficient filtering and sorting

### 3. **Business Logic**
- **Payment Applications**: Track which payments apply to which invoices
- **Supplier Sites**: Multiple payment/purchasing locations per supplier
- **Approval Workflow**: Built-in approval status management
- **Status Tracking**: Complete lifecycle management (DRAFT → PENDING → APPROVED → PAID)

### 4. **Oracle Compatibility**
- Oracle E-Business Suite R12 naming conventions
- Compatible data types and constraints
- Sequence management approach
- Standardized status enums

## Usage Examples

### Create a Supplier

```javascript
const supplierData = {
  supplier_name: "ABC Corporation",
  supplier_type: "VENDOR",
  tax_id: "TAX123456789",
  payment_terms_id: 30,
  currency_code: "USD",
  sites: [
    {
      site_name: "Main Office",
      site_type: "PAYMENT",
      address_line1: "123 Business St",
      city: "New York",
      state: "NY",
      postal_code: "10001",
      country: "USA",
      is_primary: true
    }
  ]
};

const supplier = await apiService.createAPSupplier(supplierData);
```

### Create an Invoice

```javascript
const invoiceData = {
  supplier_id: 1,
  pay_to_site_id: 1,
  invoice_number: "INV-2024-001",
  invoice_date: "2024-01-15",
  due_date: "2024-02-14",
  payment_terms_id: 30,
  currency_code: "USD",
  subtotal: 1000.00,
  tax_amount: 100.00,
  total_amount: 1100.00,
  line_items: [
    {
      item_name: "Product A",
      description: "Sample product description",
      quantity: 1,
      unit_price: 1000.00,
      line_amount: 1000.00,
      tax_rate: 10.00,
      tax_amount: 100.00
    }
  ]
};

const invoice = await apiService.createAPInvoice(invoiceData);
```

### Create a Payment with Applications

```javascript
const paymentData = {
  supplier_id: 1,
  payment_date: "2024-02-10",
  currency_code: "USD",
  total_amount: 1100.00,
  payment_method: "BANK_TRANSFER",
  bank_account: "1234567890",
  applications: [
    {
      invoice_id: 1,
      applied_amount: 1100.00,
      applied_date: "2024-02-10"
    }
  ]
};

const payment = await apiService.createAPPayment(paymentData);
```

## Monitoring and Maintenance

### Sequence Management

```javascript
// Get sequence statistics
const stats = await APSequenceManager.getSequenceStats();

// Reset sequence if needed
await APSequenceManager.resetSequence('AP_SUPPLIER_ID_SEQ', 1000);
```

### Data Validation

```sql
-- Check for orphaned records
SELECT COUNT(*) FROM ap_invoice_lines 
WHERE invoice_id NOT IN (SELECT invoice_id FROM ap_invoices);

-- Check payment applications
SELECT COUNT(*) FROM ap_payment_applications 
WHERE payment_id NOT IN (SELECT payment_id FROM ap_payments);
```

## Benefits

### 1. **Scalability**
- Normalized structure supports high-volume transactions
- Efficient indexing for fast queries
- Sequence-based ID generation prevents conflicts

### 2. **Data Quality**
- Foreign key constraints prevent data inconsistencies
- Generated columns ensure accurate calculations
- Comprehensive validation and error handling

### 3. **Business Intelligence**
- Rich data relationships enable complex reporting
- Payment application tracking for cash flow analysis
- Supplier performance metrics and analysis

### 4. **Compliance**
- Audit trail with timestamps and user tracking
- Soft deletes preserve data history
- Oracle-compatible structure for enterprise integration

## Troubleshooting

### Common Issues

1. **Sequence Conflicts**: Use `APSequenceManager.resetSequence()` to resolve
2. **Foreign Key Violations**: Ensure referenced records exist before creating relationships
3. **Performance Issues**: Check index usage with `EXPLAIN` queries
4. **Data Inconsistencies**: Run validation queries to identify orphaned records

### Support

For technical support or questions about the normalized Payables system, refer to:
- Database schema: `backend/database/schema.sql`
- Migration script: `backend/migrate-payables-to-normalized.sql`
- Setup script: `backend/setup-ap-system.js`
- API documentation: This README file 