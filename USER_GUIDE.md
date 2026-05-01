# Vritas RBQM Platform — Comprehensive User Guide

Welcome to the Vritas Risk-Based Quality Management (RBQM) platform. This guide is divided into two sections: one for **Platform Administrators** and one for **Customers (CROs & Sponsors)**.

---

## 🛡️ Part 1: Platform Admin Guide
*Target Audience: Global Administrators managing the multi-tenant infrastructure.*

### 1. Organisation Management
The core of the platform is multi-tenancy. As a Platform Admin, you can:
- **Add Organisations**: Create new "tenants" (e.g., "Acme CRO" or "Big Pharma Corp").
- **Remove Organisations**: Clean up the infrastructure by removing old or inactive organizations.
- **Subscription Management**: Assign tiers (Standard, Enterprise, Sponsor) to different organizations.

### 2. Global System Monitoring
- **Audit Logs**: Access the global audit stream to monitor security-critical events across all organizations (Logins, Registration, Deletions).
- **Organization Health**: Monitor the status (Active/Inactive) of all organizations from a central dashboard.

### 3. User & Admin Provisioning
- **Create Platform Admins**: Add additional master administrators to the platform.
- **User Support**: Verify session integrity and troubleshoot authentication issues using the `get_current_user` debug logs in the server console.

---

## 📈 Part 2: Customer User Guide
*Target Audience: CRO Admins, Central Monitors, Site Monitors, and Sponsors.*

### 1. The Risk Dashboard (The "Heart" of RBQM)
The dashboard provides a high-level view of clinical trial health:
- **Risk Portfolio**: A summary of all trials and their current risk distribution (Red/Yellow/Green).
- **Site Health Gauges**: Visual indicators of which sites require immediate attention.
- **Critical Alerts**: A prioritized list of all KRIs that have crossed the "Red" threshold.

### 2. Clinical Trial Management
- **Trial Creation**: Setup Phase I-IV trials with therapeutic areas and target lock dates.
- **Site Assignment**: Assign specific "Site Monitors" to specific clinic locations to ensure proper oversight.
- **Study Teams**: Build a collaborative team of Central Monitors and Data Managers for each study.

### 3. KRI Engine & Risk Calculation
The platform automatically calculates 20 Key Risk Indicators (KRIs) based on your data:
- **Red Threshold**: High risk. Immediate action or CAPA (Corrective and Preventive Action) required.
- **Yellow Threshold**: Moderate risk. Early warning; increased monitoring recommended.
- **Green Threshold**: Low risk. Normal site operation.

### 4. Data Ingestion (CSV Upload)
To populate your dashboard with real clinical data:
1. Go to the **Data Upload** panel.
2. Prepare your CSV files (Patients, Visits, Deviations, etc.) using the platform's standard schema.
3. Upload the files. The KRI engine will automatically process the data and update your site risk scores.

### 5. AI Insights & PDF Reporting
- **Narrative Reports**: Use the "Generate AI Report" button to get a written summary of site performance powered by clinical AI.
- **Export to PDF**: Generate professional, stakeholder-ready PDF reports for regulatory compliance or study team meetings.

---

## 🔐 Security & Access
- **Bearer Token Auth**: The platform uses modern header-based authentication to bypass browser-level cookie blocking.
- **Two-Factor Authentication (2FA)**: Enable TOTP (Google Authenticator) for an extra layer of security on sensitive accounts.
- **Role-Based Access Control (RBAC)**: Your view is automatically filtered based on your role. A Site Monitor only sees their assigned sites, while a CRO Admin sees everything within their organization.
