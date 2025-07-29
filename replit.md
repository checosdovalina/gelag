# GELAG System - Form Management Application

## Overview

GELAG is a comprehensive form management system designed for quality control and production management in industrial environments. The system enables creation, capture, and management of digital forms with role-based access control, signature capabilities, and workflow automation. It features a modern web interface built with React and TypeScript, backed by a PostgreSQL database.

## System Architecture

### Frontend Architecture
- **Technology Stack**: React 18 with TypeScript, Vite for build tooling
- **UI Framework**: shadcn/ui components with Tailwind CSS for styling
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Component Architecture**: Modular component structure with reusable UI components

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with session-based authentication
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Passport.js with local strategy and bcrypt password hashing
- **File Processing**: Multer for file uploads, XLSX parsing for Excel import

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon (cloud-managed)
- **Session Storage**: PostgreSQL-backed sessions for production, memory store for development
- **File Storage**: Local filesystem for uploaded files and generated PDFs
- **Database Schema**: Well-structured relational schema with proper foreign key relationships

## Key Components

### User Management System
- **Role-based Access Control**: SuperAdmin, Admin, Production, Quality, Production Manager, Quality Manager, Viewer roles
- **Department-based Organization**: Users are organized by departments (Production, Quality, Administration)
- **Authentication Flow**: Secure login with hashed passwords and session management

### Form Management System
- **Dynamic Form Builder**: Visual form builder with drag-and-drop interface
- **Form Templates**: Reusable form structures with JSON-based configuration
- **Advanced Table Components**: Complex table structures for data entry
- **Field Types**: Text, number, date, select, textarea, product picker, employee picker, advanced tables

### Production Management
- **Production Forms**: Specialized forms for manufacturing processes
- **Workflow Management**: Sequential approval processes with role-based permissions
- **Status Tracking**: Draft, In Progress, Completed, Signed, Approved statuses
- **Digital Signatures**: Canvas-based signature capture and storage

### Quality Control Features
- **Microbiological Analysis**: Specialized templates for laboratory analysis
- **Quality Verification**: Multi-stage quality control processes
- **Pre-operative Liberation**: Quality assurance workflows
- **Compliance Tracking**: Audit trail and compliance reporting

### Reporting and Export
- **PDF Generation**: Multiple PDF generation strategies (Puppeteer primary, PDFKit fallback)
- **Excel Export**: Data export to Excel format with formatting
- **Consolidated Reports**: Multi-form data aggregation and reporting
- **Custom Report Builder**: User-configurable report generation

## Data Flow

### Form Creation Flow
1. Admin/SuperAdmin creates form template using visual builder
2. Template structure stored as JSON in database
3. Template becomes available for data capture by authorized users

### Data Capture Flow
1. User selects form template and initiates data entry
2. Form data validated on client and server
3. Data stored with workflow status and creator information
4. Notifications sent to relevant stakeholders

### Workflow Approval Flow
1. Form submitted by initial user (Draft → In Progress)
2. Workflow progresses through role-based stages
3. Each stage requires specific user roles for approval
4. Final approval locks form and enables signature
5. Completed forms generate audit trail

### Export and Reporting Flow
1. User configures export parameters (date range, forms, fields)
2. System aggregates data from multiple sources
3. PDF/Excel generation with proper formatting
4. File served for download with proper headers

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **express**: Web server framework
- **passport**: Authentication middleware
- **@tanstack/react-query**: Data fetching and caching
- **@radix-ui**: Accessible UI components foundation

### File Processing
- **multer**: File upload handling
- **xlsx**: Excel file parsing and generation
- **puppeteer**: PDF generation from HTML
- **pdfkit**: Alternative PDF generation library

### Development Tools
- **vite**: Build tool and development server
- **typescript**: Type checking and compilation
- **tailwindcss**: Utility-first CSS framework
- **drizzle-kit**: Database schema management

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20 runtime
- **Database**: Neon PostgreSQL with connection pooling
- **Build Process**: Vite development server with HMR
- **Port Configuration**: Application runs on port 5000

### Production Deployment
- **Build Command**: `npm run build` (Vite + esbuild for server)
- **Start Command**: Database migration followed by server start
- **Environment Variables**: DATABASE_URL and SESSION_SECRET required
- **Scaling**: Configured for autoscale deployment target

### Database Management
- **Schema Migrations**: Drizzle Kit for schema synchronization
- **Connection Pooling**: Neon serverless driver with WebSocket support
- **Backup Strategy**: Cloud-managed backups through Neon platform

## Recent Changes

### July 29, 2025 - Folio Interno Field Implementation & Comprehensive Folio Filtering System
- **FOLIO INTERNO FIELD ADDED**: Implemented complete "folio interno" field functionality in production forms
- **DATABASE SCHEMA UPDATED**: Added folio_interno column to production_forms table with proper data persistence
- **FORM INTERFACE ENHANCED**: New field integrated into "Información General" section alongside main folio field
- **VIEWER INTEGRATION**: Production form viewer displays folio interno conditionally when data exists
- **PDF EXPORT UPDATED**: Folio interno now appears in PDF exports within main information table
- **COMPLETE DATA FLOW**: Field properly maps between frontend form, database storage, viewer display, and PDF generation
- **FIELD PERSISTENCE VERIFIED**: All folio fields (main, interno, baja MP, baja ME, PT) maintain data across sessions
- **SERVER ENDPOINTS UPDATED**: Create and update operations handle the new folio interno field correctly
- **USER CONFIRMATION**: PDF display of folio interno field verified working by user testing
- **COMPREHENSIVE FOLIO FILTERING**: Enhanced folio filter to search across ALL folio-related fields:
  - Folio principal, folio interno, folio de producción
  - Folio Baja MP, Folio Baja ME, Folio PT
  - Folio de liberación, número de lote
  - Dynamic detection of any field containing "folio" in the name
- **INTELLIGENT SEARCH**: Single folio filter input now searches through multiple folio fields simultaneously

### July 14, 2025 - Complete Production Form Access System Implemented
- **UNIVERSAL EDITING ACCESS**: All production form sections now editable by any user with required permissions
- **ROLE MAPPING ENHANCED**: Users with "produccion" and "calidad" roles now have full access (mapped to production_manager and quality_manager)
- **SECTION RESTRICTIONS REMOVED**: All sections (Información General, Materias Primas, Seguimiento de Proceso, Verificación de Calidad, Destino de Producto, Colador Final, Datos de Liberación) accessible to all authorized users
- **PERMISSION SYSTEM SIMPLIFIED**: Operator, production_manager, and quality_manager roles all have complete editing permissions
- **SECURITY MAINTAINED**: SuperAdmin retains unrestricted access while maintaining proper role-based authentication

### July 14, 2025 - Production Form Data Persistence System Completely Fixed
- **CRITICAL BUG RESOLVED**: Fixed updateFormMutation parameter mismatch where { id, data } object was not being passed correctly to server
- **PARAMETER STRUCTURE CORRECTED**: Changed `updateFormMutation.mutateAsync(data)` to `updateFormMutation.mutateAsync({ id: formId, data })` in production-form-page.tsx
- **DATA FLOW RESTORED**: Time fields (startTime, endTime) and all other form data now save and persist correctly across sessions
- **COMPREHENSIVE DEBUGGING**: Added detailed logging throughout the data flow pipeline from component state to server storage
- **SERVER VALIDATION CONFIRMED**: Database can store time fields correctly - issue was purely in frontend-to-server communication
- **COMPLETE FORM PERSISTENCE**: All production form sections now save and persist data correctly including Control de Proceso temperature/pressure tables
- **FIELD MAPPING FIXES**: Resolved field mapping issues between frontend form data and backend database storage
- **DATA INTEGRITY RESTORED**: Production forms now maintain all entered data across sessions and updates
- **SYNC MECHANISM ENHANCED**: Improved useEffect for data synchronization with detailed logging to prevent state overwrites

### July 11, 2025 - Mielmex Recipe Updated for 3800L Production & Complete Form Display
- **MIELMEX RECIPE UPDATED**: Updated Mielmex 65° Brix recipe for 3800 liter production with exact specifications:
  - Leche de Cabra: 3800 kg (primary ingredient)
  - Azúcar: 760 kg
  - Bicarbonato: 6.08 kg
  - Sorbato: 2.38 kg
  - All other ingredients set to 0 (Leche de Vaca, Glucosa, Malto, etc.)
- **PRODUCTION FORM COMPLETE DISPLAY**: All production form sections now display regardless of data presence:
  - Control de Proceso (always visible with 7-row temperature/pressure table)
  - Verificación de Calidad (complete 10-column quality verification table)
  - Información de Destino (destination information always shown)
  - Información Adicional (technical data including caducidad, brix, rendimiento)
- **INGREDIENT TABLE ENHANCED**: Added "Hora" (time) column to ingredient tables in both web view and PDF
- **STRUCTURED DATA DISPLAY**: Forms show default values when no data exists (e.g., "No registrado", "No medido")

### July 11, 2025 - Enhanced Production Form Visualization & Complete PDF Generation
- **COMPLETE FORM VISUALIZATION**: Production forms now display all content sections including materials, process control, quality verification, destination info, and packaging data
- **COMPREHENSIVE PDF GENERATION**: PDFs now include all form data with proper formatting including:
  - Complete materials table with quantities and times
  - Process control data with temperature/pressure tables  
  - Quality verification with all measurement parameters
  - Destination information with detailed breakdown
  - Packaging data (cono and empaque sections)
  - Quality notes and observations
  - All additional fields and states
- **IMPROVED TABLE FORMATTING**: Enhanced table display in both web view and PDF with better spacing and data organization
- **ENHANCED DATA STRUCTURE**: Updated interfaces to support all production form fields including ingredientTimes, qualityTimes, conoData, empaqueData
- **COMPLETE WORKFLOW INTEGRATION**: All production form data now properly flows from input to display to PDF export
- **PROFESSIONAL PDF LAYOUT**: Optimized PDF generation with proper spacing, headers, and structured data presentation

### July 11, 2025 - SuperAdmin Complete Access Implementation
- **SUPERADMIN ROLE FULLY IMPLEMENTED**: User role updated to "superadmin" with unrestricted access to all system functions
- **UNLIMITED FORM MANAGEMENT**: SuperAdmin can create, edit, clone, and delete forms without any restrictions
- **ADVANCED DELETION PERMISSIONS**: SuperAdmin can delete forms even when they have associated entries (automatically removes all dependencies)
- **24/7 ACCESS GRANTED**: SuperAdmin bypasses all time and schedule restrictions for complete system access
- **ENHANCED AUTHORIZATION SYSTEM**: New `isSuperAdmin()` function provides complete access verification
- **DUAL PERMISSION STRUCTURE**: SuperAdmin (unrestricted) and Admin (advanced) roles now clearly distinguished
- **BACKEND SECURITY ENHANCED**: All form management endpoints updated to support SuperAdmin unlimited access
- **FRONTEND CONTROLS UPDATED**: Management buttons and creation tools properly display for authorized roles
- **DATABASE CASCADE DELETION**: When SuperAdmin deletes forms, all associated entries are automatically removed first
- **AUDIT TRAIL MAINTAINED**: All SuperAdmin actions are logged with special "superadminAccess: true" markers

### July 8, 2025 - Auto-Save System Completely Disabled & Tab Navigation Fixed
- **AUTO-SAVE COMPLETELY DISABLED**: Removed all auto-save functionality that caused form navigation issues and session logouts
- **TAB NAVIGATION FIXED**: Users can now switch between form tabs without being logged out or redirected
- **MANUAL SAVE ONLY**: Forms now save only when users click "Guardar" button for better control
- **DUPLICATE FORM ISSUE FIXED**: Resolved bug where "Guardar" button was creating new forms instead of updating existing ones
- **SERVER ERRORS FIXED**: Corrected "users is not defined" and "desc is not defined" errors in dashboard and activity feeds
- **HORNEABLE RECIPE UPDATED**: Adjusted ingredient quantities for Horneable product to match production requirements
- **INGREDIENTS TABLE FILTERED**: Ingredients with zero quantities are now hidden from the materials table for cleaner display

### July 2, 2025 - Auto-Save System Disabled & Employee Dropdown Implementation
- **AUTO-SAVE COMPLETELY DISABLED**: Removed problematic auto-save functionality that caused multiple form saves and session issues
- **ENHANCED USER INTERFACE**: Replaced "Responsable" text input with dropdown selection from active employees
- **Employee Integration**: Connected production forms to employee database for consistent data entry
- **System Stability**: Eliminated JavaScript errors and session logout issues caused by auto-save conflicts
- **Manual Save Only**: Users now save forms manually using the "Guardar" button for better control
- **Data Quality**: Employee dropdown prevents typos and ensures consistent naming across forms
- **Filtered Selection**: Dropdown excludes viewer-only employees and users without departments, showing only active production staff
- **Department Display**: Employee dropdown shows name and department for better identification
- **Enhanced Deletion Permissions**: Admin, gerente_produccion, and gerente_calidad roles can now delete production forms
- **User Management Access**: Production and Quality managers now have access to user management module for creating and editing users
- **Complete Manager Access**: Both production and quality managers now have unrestricted access to all forms and workflow statuses without limitations
- **Production Form Creation**: Quality managers can now create, edit, and delete production forms with same permissions as production managers

### July 2, 2025 - Complete PDF Standardization for CA-RE Forms - Table Format Implementation
- **SYSTEMATIC PDF ENHANCEMENT**: Implemented comprehensive PDF generation system for all specialized forms
- **CA-RE-08-01 (Temperature Registration)**: Fixed incorrect field mapping, implemented table format with proper field identification
- **CA-RE-11-01 (Milk Liberation)**: Created dedicated PDF generator with table format for all liberation fields
- **CA-RE-14-01 (Milk Analysis)**: Implemented comprehensive PDF generator with organized sections for document info, physical-chemical analysis, and product information
- **STANDARDIZED FORMAT**: All forms now use consistent table layout with "Campo" and "Valor" headers
- **ENHANCED FIELD MAPPING**: Each form has specific field mapping logic to ensure accurate data display
- **PROFESSIONAL PRESENTATION**: Clean table format with borders, proper typography, and logical data organization
- **ORGANIZED SECTIONS**: CA-RE-14-01 includes document information, analysis parameters (Temperature, Grasa, SNG, Densidad, Lactosa, Proteína, Agua, Sólidos, Punto de Congelación, pH), and product details
- **VERIFICATION COMPLETE**: All three forms now generate accurate, professionally formatted PDFs with correct field mapping

### July 2, 2025 - New Liberación de Pastas y Cajetas Form (CA-RE-05-01) - Complete Implementation
- **NEW FORM**: Created complete "Registro de Liberación de Pastas y Cajetas" form system (CA-RE-05-01)
- **Template structure**: Professional form with document information header and comprehensive data table
- **Quality control table**: 10-column table including fecha elaboración, producto, grados Bx, consistómetro, temperatura, viscosidad, etc.
- **Advanced form fields**: 
  - Select dropdowns for apariencia (Buena/Regular/Mala) and turno (AM/PM/NOC)
  - Employee selector for responsible quality control personnel
  - Document metadata fields (empresa, revisión, departamento emisor)
- **Data capacity**: 24 rows for multiple product liberation records
- **Database integration**: Successfully created template ID 27 in database using direct SQL insertion
- **Form structure**: Follows GELAG company standards with proper headers and Control de Calidad section

### July 2, 2025 - Daily Cleaning Inspection System (CA-RE-07-01) - Complete Enhancement
- **NEW SYSTEM**: Created complete daily cleaning inspection system with checklist-based format
- **Template structure**: 12 inspection sections covering all facility areas (Aduana Personal, Almacén Materia Prima, Área de Reposo, etc.)
- **Enhanced checklist tables**: Implemented "Pasa/No Pasa" mutually exclusive options replacing simple checkboxes
- **Employee integration**: Added "Realizado por" dropdown selection at the end of each inspection section
- **Employee data loading**: Fixed query conditions to ensure employee list loads correctly for checklist forms
- **Document information section**: Added comprehensive "Información del Documento" section with:
  - FECHA (required date field)
  - FOLIO (required manual text entry)
  - FOLIO DE PRODUCCIÓN (optional manual text entry)
  - Departamento emisor (dropdown with Control de Calidad, Producción, Administración options)
- **Data format**: Each section displays activities with "Pasa" and "No Pasa" columns for binary assessment
- **Observations field**: Added dedicated observations section for additional comments and notes
- **Form integration**: Fully integrated with existing form system for creation, saving, and data management
- **UI enhancement**: Sections display as collapsible accordions with professional styling
- **Employee dropdown functionality**: Successfully resolved employee loading issues for dropdown population

### July 1, 2025 - Production Form Time Field Persistence Fix & Quality Verification Table Design
- **RESOLVED**: Fixed time field persistence issue in production forms where startTime/endTime were not saving correctly
- **Root cause**: Frontend useEffect was overwriting user input with null values from server responses
- **Solution implemented**: Modified state synchronization to preserve local time values when server returns null/empty
- **Data flow corrected**: Fixed incorrect parameter passing between page and mutation hook
- **Quality verification redesign**: Converted quality verification view from overlapping grid layout to clean table format
- **Table structure**: New table displays all quality metrics (Hora, Brix, Temp, Textura, Color, Viscosidad, Olor, Sabor, Material Extraño, Estado) in organized rows
- **Data filtering**: Table only shows rows with actual data, preventing empty row display
- **Responsive design**: Added horizontal scroll for table on smaller screens

### June 25, 2025 - Complete Total Percentage Calculation System & PDF Export Fix
- **Implemented automatic total percentage calculation** for Liberación Preoperativa forms
- **Multi-field detection**: Enhanced template detection to work with formTemplate.name, formTitle, and structure properties
- **Real-time total updates**: "Porcentaje Cumplimiento Total" field updates automatically when individual section percentages change
- **Weighted average calculation**: Uses 20% weight per section (Marmitas, Dulces, Producción, Reposo, Limpieza) for balanced scoring
- **Direct calculation integration**: Total percentage updates immediately after individual section calculations complete
- **Comprehensive logging**: Detailed console logs for debugging and verification of calculation process
- **Proven functionality**: System verified working with live data showing 92% total from individual section percentages
- **Fixed PDF export formatting**: Replaced JSON display with professional structured format for Liberación Preoperativa forms
- **Added folio filter**: New filter in captured forms page allows searching by folio number or production folio
- **Employee module access for managers**: Production and quality managers can now access employee module, create operative employees, but cannot delete any employees
- **Enhanced PDF export for PR-PR-02 forms**: REVISION table moved to new page, added all additional form fields and tabs data including cono tables, empaque tables, and detailed observations

### June 24, 2025 - Checkbox System Resolution and Enhancement
- **Fixed checkbox rendering issue**: Resolved template/code mismatch where columns were defined as "select" type but needed checkbox behavior
- **Enhanced column detection**: Added smart detection for revision_visual columns to render as checkboxes regardless of type definition
- **Improved user interface**: Checkboxes now display correctly in all Liberación Preoperativa tables
- **Percentage calculation fix**: Updated calculation logic to handle both uppercase "SI" and lowercase "si" values
- **Template compatibility**: System now handles mixed column type definitions gracefully

### June 23, 2025 - Automatic Percentage Calculation System
- **Implemented automatic percentage calculation** for Liberación Preoperativa forms
- **Server-side calculation**: Percentages update automatically when checklist data is saved
- **Multi-section support**: Calculates compliance percentages for all 5 sections (Marmitas, Dulces, Producción, Reposo, Limpieza)
- **Real-time updates**: Percentages recalculate instantly when users make SI/NO selections
- **Smart logic**: Only counts "SI" selections, ignores "NO" and empty values
- **Example**: 3 out of 4 items marked "SI" = 75% compliance automatically calculated

### System Architecture Updates
- **Enhanced form processing**: Added percentage calculation middleware in server routes
- **Improved data flow**: Automatic calculation happens during form save operations
- **Template detection**: System automatically identifies Liberación Preoperativa forms for percentage processing
- **Checkbox rendering system**: Advanced table viewer now supports multiple column type interpretations for optimal user experience

## Changelog

- June 23, 2025. Initial setup and automatic percentage calculation implementation

## User Preferences

Preferred communication style: Simple, everyday language.