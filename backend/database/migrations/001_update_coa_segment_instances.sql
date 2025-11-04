-- ============================================================================
-- Migration: Update segments structure for accounting and CoA segments
-- Date: 2025-11-03
-- Description: Create segments table for accounting types and restructure
--              coa_segment_instances for CoA segment structures
-- ============================================================================

-- ============================================================================
-- Part 1: Accounting Segment Types (ASSETS, LIABILITIES, etc.)
-- ============================================================================

-- Create the segments table for accounting categories
CREATE TABLE IF NOT EXISTS segments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    segment_id VARCHAR(50) UNIQUE NOT NULL,
    segment_code VARCHAR(50) UNIQUE NOT NULL,
    segment_name VARCHAR(255) NOT NULL,
    segment_type ENUM('ASSETS', 'LIABILITIES', 'EQUITY', 'REVENUE', 'EXPENSE') NOT NULL,
    segment_use TEXT NULL,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_segment_id (segment_id),
    INDEX idx_segment_code (segment_code),
    INDEX idx_segment_name (segment_name),
    INDEX idx_segment_type (segment_type),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by)
);

-- Insert default accounting segments (categories)
INSERT INTO segments (segment_id, segment_code, segment_name, segment_type, segment_use, status, created_by) VALUES
('SEG-ASSETS-001', 'ASSETS', 'Assets', 'ASSETS', 'Use for all asset accounts including current assets, fixed assets, and intangible assets', 'ACTIVE', 1),
('SEG-LIAB-001', 'LIABILITIES', 'Liabilities', 'LIABILITIES', 'Use for all liability accounts including current liabilities, long-term debt, and other obligations', 'ACTIVE', 1),
('SEG-EQUITY-001', 'EQUITY', 'Equity', 'EQUITY', 'Use for equity accounts including capital, retained earnings, and reserves', 'ACTIVE', 1),
('SEG-REV-001', 'REVENUE', 'Revenue', 'REVENUE', 'Use for all revenue and income accounts from primary business operations and other sources', 'ACTIVE', 1),
('SEG-EXP-001', 'EXPENSE', 'Expenses', 'EXPENSE', 'Use for all expense accounts including operating expenses, cost of goods sold, and other costs', 'ACTIVE', 1)
ON DUPLICATE KEY UPDATE 
    segment_name=VALUES(segment_name), 
    segment_use=VALUES(segment_use),
    status=VALUES(status);

-- ============================================================================
-- Part 2: CoA Segment Instances (Chart of Accounts Structure)
-- ============================================================================

-- Drop and recreate the coa_segment_instances table with improved structure
DROP TABLE IF EXISTS coa_segment_instances;

CREATE TABLE IF NOT EXISTS coa_segment_instances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coa_instance_id INT NOT NULL,
    segment_name VARCHAR(100) NOT NULL,
    segment_length INT NOT NULL DEFAULT 5,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (coa_instance_id) REFERENCES coa_instances(id) ON DELETE CASCADE,
    INDEX idx_coa_instance_id (coa_instance_id),
    INDEX idx_display_order (display_order),
    INDEX idx_is_active (is_active),
    UNIQUE KEY uk_coa_segment (coa_instance_id, display_order)
);

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify the migration
SELECT 'Migration completed successfully!' AS status;
SELECT COUNT(*) AS total_accounting_segments FROM segments;
SELECT COUNT(*) AS total_coa_segments FROM coa_segment_instances;

