-- ============================================================================
-- PAYABLES MIGRATION SCRIPT
-- Migrates from flat vendor_invoices and payments tables to normalized AP system
-- Oracle E-Business Suite R12 Model
-- ============================================================================

-- Function to get next sequence value
DELIMITER $$

CREATE OR REPLACE FUNCTION get_next_sequence(seq_name VARCHAR(50)) 
RETURNS BIGINT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE next_val BIGINT;
    
    UPDATE ar_sequences 
    SET current_value = current_value + increment_by 
    WHERE sequence_name = seq_name;
    
    SELECT current_value INTO next_val 
    FROM ar_sequences 
    WHERE sequence_name = seq_name;
    
    RETURN next_val;
END$$

-- Procedure to migrate suppliers from vendor_invoices
CREATE OR REPLACE PROCEDURE migrate_suppliers()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE vendor_name_val VARCHAR(255);
    DECLARE vendor_id_val VARCHAR(50);
    DECLARE supplier_id_val BIGINT;
    DECLARE supplier_exists INT DEFAULT 0;
    
    DECLARE vendor_cursor CURSOR FOR 
        SELECT DISTINCT vendor_name, vendor_id 
        FROM vendor_invoices 
        WHERE vendor_name IS NOT NULL AND vendor_name != '';
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Start transaction
    START TRANSACTION;
    
    OPEN vendor_cursor;
    
    vendor_loop: LOOP
        FETCH vendor_cursor INTO vendor_name_val, vendor_id_val;
        IF done THEN
            LEAVE vendor_loop;
        END IF;
        
        -- Check if supplier already exists
        SELECT COUNT(*) INTO supplier_exists 
        FROM ap_suppliers 
        WHERE supplier_name = vendor_name_val;
        
        IF supplier_exists = 0 THEN
            -- Generate supplier number
            SET supplier_id_val = get_next_sequence('AP_SUPPLIER_ID_SEQ');
            
            -- Insert supplier
            INSERT INTO ap_suppliers (
                supplier_id,
                supplier_number,
                supplier_name,
                supplier_type,
                tax_id,
                payment_terms_id,
                currency_code,
                status,
                created_by
            ) VALUES (
                supplier_id_val,
                CONCAT('SUP', LPAD(supplier_id_val, 6, '0')),
                vendor_name_val,
                'VENDOR',
                vendor_id_val,
                30,
                'USD',
                'ACTIVE',
                1  -- Default user ID
            );
            
            -- Create default payment site
            INSERT INTO ap_supplier_sites (
                site_id,
                supplier_id,
                site_name,
                site_type,
                is_primary,
                status
            ) VALUES (
                get_next_sequence('AP_SUPPLIER_SITE_ID_SEQ'),
                supplier_id_val,
                CONCAT(vendor_name_val, ' - Payment Site'),
                'PAYMENT',
                TRUE,
                'ACTIVE'
            );
        END IF;
    END LOOP;
    
    CLOSE vendor_cursor;
    
    COMMIT;
    
    SELECT 'Suppliers migration completed successfully' AS message;
END$$

-- Procedure to migrate vendor invoices to normalized structure
CREATE OR REPLACE PROCEDURE migrate_vendor_invoices()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE invoice_id_val INT;
    DECLARE invoice_number_val VARCHAR(50);
    DECLARE vendor_name_val VARCHAR(255);
    DECLARE vendor_id_val VARCHAR(50);
    DECLARE invoice_date_val DATE;
    DECLARE due_date_val DATE;
    DECLARE payment_terms_val INT;
    DECLARE subtotal_val DECIMAL(15,2);
    DECLARE tax_amount_val DECIMAL(15,2);
    DECLARE total_val DECIMAL(15,2);
    DECLARE currency_val VARCHAR(10);
    DECLARE status_val VARCHAR(20);
    DECLARE notes_val TEXT;
    DECLARE line_items_val JSON;
    DECLARE created_at_val TIMESTAMP;
    DECLARE updated_at_val TIMESTAMP;
    
    DECLARE new_invoice_id_val BIGINT;
    DECLARE supplier_id_val BIGINT;
    DECLARE pay_to_site_id_val BIGINT;
    DECLARE line_item_count INT;
    DECLARE i INT DEFAULT 0;
    DECLARE line_item JSON;
    DECLARE line_number_val INT;
    DECLARE item_name_val VARCHAR(255);
    DECLARE description_val TEXT;
    DECLARE quantity_val DECIMAL(10,2);
    DECLARE unit_price_val DECIMAL(15,2);
    DECLARE amount_val DECIMAL(15,2);
    
    DECLARE invoice_cursor CURSOR FOR 
        SELECT id, invoice_number, vendor_name, vendor_id, invoice_date, due_date,
               payment_terms, subtotal, tax_amount, total, currency, status, notes,
               line_items, created_at, updated_at
        FROM vendor_invoices;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Start transaction
    START TRANSACTION;
    
    OPEN invoice_cursor;
    
    invoice_loop: LOOP
        FETCH invoice_cursor INTO invoice_id_val, invoice_number_val, vendor_name_val, 
              vendor_id_val, invoice_date_val, due_date_val, payment_terms_val,
              subtotal_val, tax_amount_val, total_val, currency_val, status_val,
              notes_val, line_items_val, created_at_val, updated_at_val;
        
        IF done THEN
            LEAVE invoice_loop;
        END IF;
        
        -- Get supplier ID
        SELECT supplier_id INTO supplier_id_val 
        FROM ap_suppliers 
        WHERE supplier_name = vendor_name_val 
        LIMIT 1;
        
        -- Get primary payment site
        SELECT site_id INTO pay_to_site_id_val 
        FROM ap_supplier_sites 
        WHERE supplier_id = supplier_id_val AND is_primary = TRUE 
        LIMIT 1;
        
        -- Generate new invoice ID
        SET new_invoice_id_val = get_next_sequence('AP_INVOICE_ID_SEQ');
        
        -- Insert invoice header
        INSERT INTO ap_invoices (
            invoice_id,
            invoice_number,
            supplier_id,
            pay_to_site_id,
            invoice_date,
            due_date,
            payment_terms_id,
            currency_code,
            subtotal,
            tax_amount,
            total_amount,
            status,
            notes,
            created_by,
            created_at,
            updated_at
        ) VALUES (
            new_invoice_id_val,
            invoice_number_val,
            supplier_id_val,
            pay_to_site_id_val,
            invoice_date_val,
            COALESCE(due_date_val, DATE_ADD(invoice_date_val, INTERVAL payment_terms_val DAY)),
            COALESCE(payment_terms_val, 30),
            COALESCE(currency_val, 'USD'),
            COALESCE(subtotal_val, 0),
            COALESCE(tax_amount_val, 0),
            COALESCE(total_val, 0),
            CASE 
                WHEN status_val = 'paid' THEN 'PAID'
                WHEN status_val = 'pending' THEN 'PENDING'
                WHEN status_val = 'overdue' THEN 'PENDING'
                WHEN status_val = 'cancelled' THEN 'CANCELLED'
                ELSE 'DRAFT'
            END,
            notes_val,
            1,  -- Default user ID
            created_at_val,
            updated_at_val
        );
        
        -- Migrate line items
        IF line_items_val IS NOT NULL AND JSON_VALID(line_items_val) THEN
            SET line_item_count = JSON_LENGTH(line_items_val);
            SET i = 0;
            
            WHILE i < line_item_count DO
                SET line_item = JSON_EXTRACT(line_items_val, CONCAT('$[', i, ']'));
                
                SET line_number_val = i + 1;
                SET item_name_val = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(line_item, '$.item_name')), 'Unknown Item');
                SET description_val = JSON_UNQUOTE(JSON_EXTRACT(line_item, '$.description'));
                SET quantity_val = COALESCE(JSON_EXTRACT(line_item, '$.quantity'), 1);
                SET unit_price_val = COALESCE(JSON_EXTRACT(line_item, '$.unit_price'), 0);
                SET amount_val = COALESCE(JSON_EXTRACT(line_item, '$.amount'), 0);
                
                -- Insert line item
                INSERT INTO ap_invoice_lines (
                    line_id,
                    invoice_id,
                    line_number,
                    item_name,
                    description,
                    quantity,
                    unit_price,
                    line_amount,
                    tax_rate,
                    tax_amount
                ) VALUES (
                    get_next_sequence('AP_INVOICE_LINE_ID_SEQ'),
                    new_invoice_id_val,
                    line_number_val,
                    item_name_val,
                    description_val,
                    quantity_val,
                    unit_price_val,
                    amount_val,
                    0,  -- Default tax rate
                    0   -- Default tax amount
                );
                
                SET i = i + 1;
            END WHILE;
        END IF;
    END LOOP;
    
    CLOSE invoice_cursor;
    
    COMMIT;
    
    SELECT 'Vendor invoices migration completed successfully' AS message;
END$$

-- Procedure to migrate payments to normalized structure
CREATE OR REPLACE PROCEDURE migrate_payments()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE payment_id_val INT;
    DECLARE payment_number_val VARCHAR(50);
    DECLARE payment_date_val DATE;
    DECLARE vendor_name_val VARCHAR(255);
    DECLARE vendor_id_val VARCHAR(50);
    DECLARE invoice_number_val VARCHAR(50);
    DECLARE amount_paid_val DECIMAL(15,2);
    DECLARE currency_val VARCHAR(10);
    DECLARE payment_method_val VARCHAR(50);
    DECLARE bank_account_val VARCHAR(100);
    DECLARE reference_number_val VARCHAR(100);
    DECLARE status_val VARCHAR(20);
    DECLARE description_val TEXT;
    DECLARE notes_val TEXT;
    DECLARE created_at_val TIMESTAMP;
    DECLARE updated_at_val TIMESTAMP;
    
    DECLARE new_payment_id_val BIGINT;
    DECLARE supplier_id_val BIGINT;
    DECLARE ap_invoice_id_val BIGINT;
    DECLARE application_id_val BIGINT;
    
    DECLARE payment_cursor CURSOR FOR 
        SELECT id, payment_number, payment_date, vendor_name, vendor_id, invoice_number,
               amount_paid, currency, payment_method, bank_account, reference_number,
               status, description, notes, created_at, updated_at
        FROM payments;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Start transaction
    START TRANSACTION;
    
    OPEN payment_cursor;
    
    payment_loop: LOOP
        FETCH payment_cursor INTO payment_id_val, payment_number_val, payment_date_val,
              vendor_name_val, vendor_id_val, invoice_number_val, amount_paid_val,
              currency_val, payment_method_val, bank_account_val, reference_number_val,
              status_val, description_val, notes_val, created_at_val, updated_at_val;
        
        IF done THEN
            LEAVE payment_loop;
        END IF;
        
        -- Get supplier ID
        SELECT supplier_id INTO supplier_id_val 
        FROM ap_suppliers 
        WHERE supplier_name = vendor_name_val 
        LIMIT 1;
        
        -- Generate new payment ID
        SET new_payment_id_val = get_next_sequence('AP_PAYMENT_ID_SEQ');
        
        -- Insert payment header
        INSERT INTO ap_payments (
            payment_id,
            payment_number,
            supplier_id,
            payment_date,
            currency_code,
            total_amount,
            payment_method,
            bank_account,
            reference_number,
            status,
            notes,
            created_by,
            created_at,
            updated_at
        ) VALUES (
            new_payment_id_val,
            payment_number_val,
            supplier_id_val,
            payment_date_val,
            COALESCE(currency_val, 'USD'),
            amount_paid_val,
            payment_method_val,
            bank_account_val,
            reference_number_val,
            CASE 
                WHEN status_val = 'processed' THEN 'CLEARED'
                WHEN status_val = 'pending' THEN 'CONFIRMED'
                WHEN status_val = 'failed' THEN 'CANCELLED'
                WHEN status_val = 'cancelled' THEN 'CANCELLED'
                ELSE 'DRAFT'
            END,
            COALESCE(notes_val, description_val),
            1,  -- Default user ID
            created_at_val,
            updated_at_val
        );
        
        -- Create payment application if invoice number is provided
        IF invoice_number_val IS NOT NULL AND invoice_number_val != '' THEN
            -- Find corresponding AP invoice
            SELECT invoice_id INTO ap_invoice_id_val 
            FROM ap_invoices 
            WHERE invoice_number = invoice_number_val 
            LIMIT 1;
            
            IF ap_invoice_id_val IS NOT NULL THEN
                SET application_id_val = get_next_sequence('AP_PAYMENT_APPLICATION_ID_SEQ');
                
                -- Insert payment application
                INSERT INTO ap_payment_applications (
                    application_id,
                    payment_id,
                    invoice_id,
                    applied_amount,
                    applied_date,
                    status,
                    notes,
                    created_by
                ) VALUES (
                    application_id_val,
                    new_payment_id_val,
                    ap_invoice_id_val,
                    amount_paid_val,
                    payment_date_val,
                    'ACTIVE',
                    'Migrated from legacy payments table',
                    1  -- Default user ID
                );
                
                -- Update invoice amount_paid
                UPDATE ap_invoices 
                SET amount_paid = amount_paid + amount_paid_val,
                    status = CASE 
                        WHEN (amount_paid + amount_paid_val) >= total_amount THEN 'PAID'
                        ELSE 'PENDING'
                    END
                WHERE invoice_id = ap_invoice_id_val;
                
                -- Update payment amount_applied
                UPDATE ap_payments 
                SET amount_applied = amount_applied + amount_paid_val
                WHERE payment_id = new_payment_id_val;
            END IF;
        END IF;
    END LOOP;
    
    CLOSE payment_cursor;
    
    COMMIT;
    
    SELECT 'Payments migration completed successfully' AS message;
END$$

-- Main migration procedure
CREATE OR REPLACE PROCEDURE migrate_payables_system()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    -- Start migration
    SELECT 'Starting Payables migration...' AS message;
    
    -- Step 1: Migrate suppliers
    CALL migrate_suppliers();
    
    -- Step 2: Migrate vendor invoices
    CALL migrate_vendor_invoices();
    
    -- Step 3: Migrate payments
    CALL migrate_payments();
    
    -- Step 4: Update sequences to avoid conflicts
    UPDATE ar_sequences 
    SET current_value = (
        SELECT COALESCE(MAX(supplier_id), 0) + 1 
        FROM ap_suppliers
    ) 
    WHERE sequence_name = 'AP_SUPPLIER_ID_SEQ';
    
    UPDATE ar_sequences 
    SET current_value = (
        SELECT COALESCE(MAX(site_id), 0) + 1 
        FROM ap_supplier_sites
    ) 
    WHERE sequence_name = 'AP_SUPPLIER_SITE_ID_SEQ';
    
    UPDATE ar_sequences 
    SET current_value = (
        SELECT COALESCE(MAX(invoice_id), 0) + 1 
        FROM ap_invoices
    ) 
    WHERE sequence_name = 'AP_INVOICE_ID_SEQ';
    
    UPDATE ar_sequences 
    SET current_value = (
        SELECT COALESCE(MAX(line_id), 0) + 1 
        FROM ap_invoice_lines
    ) 
    WHERE sequence_name = 'AP_INVOICE_LINE_ID_SEQ';
    
    UPDATE ar_sequences 
    SET current_value = (
        SELECT COALESCE(MAX(payment_id), 0) + 1 
        FROM ap_payments
    ) 
    WHERE sequence_name = 'AP_PAYMENT_ID_SEQ';
    
    UPDATE ar_sequences 
    SET current_value = (
        SELECT COALESCE(MAX(application_id), 0) + 1 
        FROM ap_payment_applications
    ) 
    WHERE sequence_name = 'AP_PAYMENT_APPLICATION_ID_SEQ';
    
    SELECT 'Payables migration completed successfully!' AS message;
    SELECT 
        (SELECT COUNT(*) FROM ap_suppliers) AS suppliers_migrated,
        (SELECT COUNT(*) FROM ap_invoices) AS invoices_migrated,
        (SELECT COUNT(*) FROM ap_payments) AS payments_migrated,
        (SELECT COUNT(*) FROM ap_payment_applications) AS applications_migrated;
END$$

DELIMITER ;

-- Execute migration
CALL migrate_payables_system();

-- Clean up procedures (optional - keep for future migrations)
-- DROP PROCEDURE IF EXISTS migrate_suppliers;
-- DROP PROCEDURE IF EXISTS migrate_vendor_invoices;
-- DROP PROCEDURE IF EXISTS migrate_payments;
-- DROP PROCEDURE IF EXISTS migrate_payables_system;
-- DROP FUNCTION IF EXISTS get_next_sequence; 