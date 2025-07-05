import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

function Header() {
    return (
        <header className="app-header">
            <nav className="navbar">
                <Link to="/" className="navbar-brand">AI Recruiter</Link>
                <ul className="navbar-nav">
                    <li className="nav-item">
                        <Link to="/" className="nav-link">Job Descriptions</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/candidates" className="nav-link">Candidates</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/interviews" className="nav-link">Interviews</Link> {/* Link to see all interviews */}
                    </li>
                    <li className="nav-item">
                        <Link to="/assessments" className="nav-link">Assessments</Link> {/* NEW Link */}
                    </li>
                    {/* NEW: Link for Analytics & Reporting (will create this component later) */}
                    <li className="nav-item">
                        <Link to="/analytics" className="nav-link">Analytics</Link>
                    </li>
                     <li className="nav-item">
                        <Link to="/analytics" className="nav-link">Analytics</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/bias-detection" className="nav-link">Bias Detection</Link> {/* NEW Link */}
                    </li>
                    <li className="nav-item">
                        <Link to="/ats" className="nav-link">ATS</Link> {/* NEW Link for ATS */}
                    </li>
                     <li className="nav-item">
                        <Link to="/" className="nav-link">Jobs</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/ats" className="nav-link">ATS</Link> {/* Main ATS View */}
                    </li>
                    <li className="nav-item">
                        <Link to="/interviews" className="nav-link">Interviews</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/assessments" className="nav-link">Assessments</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/outreach-campaigns" className="nav-link">Outreach</Link> {/* NEW */}
                    </li>
                    <li className="nav-item">
                        <Link to="/analytics" className="nav-link">Analytics</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/bias-detection" className="nav-link">Bias</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/pipeline-stages" className="nav-link">Pipeline</Link> {/* NEW */}
                    </li>
                    {/* Add a link for bulk upload if desired in header */}
                    {/* <li className="nav-item">
                        <Link to="/candidates/bulk-upload" className="nav-link">Bulk Upload</Link>
                    </li> */}
                </ul>
            </nav>
        </header>
    );
}

export default Header;