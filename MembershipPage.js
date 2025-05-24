import React, { useEffect, useState } from 'react';
import { getProfile } from '../services/userService';
import { getMemberships } from '../services/membershipService';
import MembershipModal from '../components/MembershipModal';
import Layout from '../components/Layout';
import '../styles/MembershipPage.css';

const MembershipPage = () => {
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [selectedMembership, setSelectedMembership] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMemberships, setLoadingMemberships] = useState(true);
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const userData = await getProfile(token);
        setUser(userData);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [token]);

  useEffect(() => {
    if (user) {
      async function fetchMemberships() {
        try {
          setLoadingMemberships(true);
          const membershipsData = await getMemberships(user.id, token);
          setMemberships(membershipsData);
        } catch (error) {
          console.error("Failed to fetch membership info:", error);
        } finally {
          setLoadingMemberships(false);
        }
      }
      fetchMemberships();
    }
  }, [user, token]);

  const handleReceiptUploaded = async () => {
    try {
      const updatedMemberships = await getMemberships(user.id, token);
      setMemberships(updatedMemberships);
      setSelectedMembership(null);
    } catch (error) {
      console.error("Failed to update membership records:", error);
    }
  };

  const getProgressData = (status, denialReason) => {
    const lower = status ? status.trim().toLowerCase() : "";
    let progressPercentage = 0;
    let progressColor = "#e0e0e0";
    let displayStatus = status;
    let statusClass = "";
    
    if (lower === "not paid") {
      if (denialReason) {
        progressPercentage = 0;
        progressColor = "#dc3545";
        displayStatus = "Denied";
        statusClass = "status-denied";
      } else {
        progressPercentage = 0;
        progressColor = "#e0e0e0";
        statusClass = "status-not-paid";
      }
    } else if (lower === "verifying") {
      progressPercentage = 50;
      progressColor = "#ffc107";
      statusClass = "status-verifying";
    } else if (lower === "paid") {
      progressPercentage = 100;
      progressColor = "#28a745";
      statusClass = "status-paid";
    }
    return { progressPercentage, progressColor, displayStatus, statusClass };
  };

  if (isLoading) {
    return (
      <div className="page-loading">
        <div className="loader"></div>
        <p>Loading Membership Information...</p>
      </div>
    );
  }

  if (!user) {
    return <div className="error-message">Unable to load user data. Please try again later.</div>;
  }

  const notPaidOrDeniedMemberships = memberships.filter(
    (m) => m.payment_status?.trim().toLowerCase() === "not paid"
  );

  const verifyingMemberships = memberships.filter(
    (m) => m.payment_status?.trim().toLowerCase() === "verifying"
  );

  const paidMemberships = memberships.filter(
    (m) => m.payment_status?.trim().toLowerCase() === "paid"
  );

  // Reusable component for membership card
  const MembershipCard = ({ membership }) => {
    const { progressPercentage, progressColor, displayStatus, statusClass } = getProgressData(
      membership.payment_status, 
      membership.denial_reason
    );

    const formatDate = (dateString) => {
      if (!dateString) return "Not available";
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    };
    
    return (
      <div
        className={`membership-card ${statusClass}`}
        onClick={() => setSelectedMembership(membership)}
      >
        <div className="card-badge" style={{ backgroundColor: progressColor }}>
          {displayStatus}
        </div>
        <div className="membership-card-inner">
          <div className="card-header">
            <div className="requirement-icon"></div>
            <h3 className="requirement-name">{membership.requirement || "N/A"}</h3>
          </div>
          
          <div className="progress-container">
            <div className="progress-label">
              <span>Progress</span>
              <span>{progressPercentage}%</span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${progressPercentage}%`, backgroundColor: progressColor }}
              ></div>
            </div>
          </div>
          
          <div className="membership-details">
            <div className="detail-group">
              <div className="detail-item">
                <span className="detail-label">Amount:</span>
                <span className="detail-value">₱{membership.amount || "0"}</span>
              </div>
              
              {membership.due_date && (
                <div className="detail-item">
                  <span className="detail-label">Due Date:</span>
                  <span className="detail-value">{formatDate(membership.due_date)}</span>
                </div>
              )}
              
              {membership.receipt_path && (
                <div className="detail-item">
                  <span className="detail-label">Receipt:</span>
                  <span className="detail-value receipt-available">
                    <span className="receipt-icon"></span>Available
                  </span>
                </div>
              )}
            </div>
            
            {membership.denial_reason && (
              <div className="denial-reason">
                <div className="denial-header">
                  <span className="warning-icon"></span>
                  <span>Payment Denied</span>
                </div>
                <p className="reason-text">{membership.denial_reason}</p>
              </div>
            )}
            
            <div className="card-cta">
              <button className="view-details-btn">View Details</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Reusable section component
  const MembershipSection = ({ title, memberships, emptyMessage, iconClass }) => {
    return (
      <div className={`membership-section ${iconClass}`}>
        <div className="section-header">
          <div className="section-icon"></div>
          <h2>{title}</h2>
        </div>
        
        {loadingMemberships ? (
          <div className="membership-loading">
            <div className="loading-indicator">Loading membership data...</div>
          </div>
        ) : memberships.length > 0 ? (
          <div className="memberships-grid">
            {memberships.map((membership) => (
              <MembershipCard key={membership.id} membership={membership} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon"></div>
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout user={user}>
      <div className="membership-page">
        <MembershipSection 
          title="Not Paid / Denied Memberships" 
          memberships={notPaidOrDeniedMemberships}
          emptyMessage="You have no unpaid or denied memberships."
          iconClass="unpaid-section"
        />

        <MembershipSection 
          title="Verifying Memberships" 
          memberships={verifyingMemberships}
          emptyMessage="You have no memberships in verification status."
          iconClass="verifying-section"
        />

        <MembershipSection 
          title="Paid Memberships" 
          memberships={paidMemberships}
          emptyMessage="You have no paid memberships yet."
          iconClass="paid-section"
        />

        {selectedMembership && (
          <MembershipModal
            membership={selectedMembership}
            onClose={() => setSelectedMembership(null)}
            onReceiptUploaded={handleReceiptUploaded}
          />
        )}
      </div>
    </Layout>
  );
};

export default MembershipPage;