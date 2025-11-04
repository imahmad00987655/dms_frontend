-- ============================================================================
-- Migration: Update Header Assignments Structure
-- Date: 2025-11-04
-- Description: Restructure header assignments to support many-to-many
--              relationships with CoA instances, ledgers, and modules
-- ============================================================================

-- ============================================================================
-- Part 1: Drop old table
-- ============================================================================

DROP TABLE IF EXISTS ledger_header_assignments;

-- ============================================================================
-- Part 2: Create new header assignments structure
-- ============================================================================

-- Main header assignments table
CREATE TABLE IF NOT EXISTS header_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    header_id VARCHAR(50) UNIQUE NOT NULL,
    header_name VARCHAR(255) NOT NULL,
    coa_instance_id INT NOT NULL,
    validation_rules JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (coa_instance_id) REFERENCES coa_instances(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_header_id (header_id),
    INDEX idx_header_name (header_name),
    INDEX idx_coa_instance_id (coa_instance_id),
    INDEX idx_is_active (is_active),
    INDEX idx_created_by (created_by)
);

-- Junction table for header-to-ledger assignments (many-to-many)
CREATE TABLE IF NOT EXISTS header_ledger_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    header_assignment_id INT NOT NULL,
    ledger_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (header_assignment_id) REFERENCES header_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (ledger_id) REFERENCES ledger_configurations(id) ON DELETE CASCADE,
    UNIQUE KEY uk_header_ledger (header_assignment_id, ledger_id),
    INDEX idx_header_assignment_id (header_assignment_id),
    INDEX idx_ledger_id (ledger_id),
    INDEX idx_is_active (is_active)
);

-- Junction table for header-to-module assignments (many-to-many)
CREATE TABLE IF NOT EXISTS header_module_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    header_assignment_id INT NOT NULL,
    module_type ENUM('AR', 'AP', 'JV', 'PO', 'INVENTORY', 'ASSETS', 'GL') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (header_assignment_id) REFERENCES header_assignments(id) ON DELETE CASCADE,
    UNIQUE KEY uk_header_module (header_assignment_id, module_type),
    INDEX idx_header_assignment_id (header_assignment_id),
    INDEX idx_module_type (module_type),
    INDEX idx_is_active (is_active)
);

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'Migration completed successfully!' AS status;
SELECT COUNT(*) AS total_header_assignments FROM header_assignments;
SELECT COUNT(*) AS total_header_ledger_assignments FROM header_ledger_assignments;
SELECT COUNT(*) AS total_header_module_assignments FROM header_module_assignments;

