import React, { useEffect, useState } from 'react';
import { getProfile } from '../services/userService';
import { getEvents, joinEvent, leaveEvent } from '../services/eventService';
import EventCard from '../components/EventCard';
import EventModal from '../components/EventModal';
import Layout from '../components/Layout';
import '../styles/EventsPage.css';

const backendBaseUrl = "http://localhost:8000";

const EventsPage = () => {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // Filter for all, upcoming, registered
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    async function fetchProfile() {
      try {
        const userData = await getProfile(token);
        setUser(userData);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProfile();
  }, [token]);

  useEffect(() => {
    async function fetchEvents() {
      setIsEventsLoading(true);
      try {
        const eventsData = await getEvents(token);
        setEvents(eventsData);

        // If we have a selected event, update it with the latest data
        if (selectedEvent) {
          const updatedEvent = eventsData.find(e => e.id === selectedEvent.id);
          if (updatedEvent) {
            setSelectedEvent(updatedEvent);
          }
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setIsEventsLoading(false);
      }
    }
    fetchEvents();
  }, [token]);

  const handleCardClick = async (event) => {
    try {
      const res = await fetch(`${backendBaseUrl}/events/${event.id}/participants`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const participants = await res.json();
      setSelectedEvent({ ...event, participants });
    } catch (error) {
      console.error('Failed to fetch participants:', error);
      setSelectedEvent(event); // fallback without participants
    }
  };

  const closeModal = () => {
    setSelectedEvent(null);
  };

  const handleParticipate = async (eventId) => {
    try {
      await joinEvent(eventId, token);
      const updatedEvents = await getEvents(token);
      setEvents(updatedEvents);
      closeModal();
    } catch (error) {
      console.error('Failed to join event:', error);
    }
  };

  const handleNotParticipate = async (eventId) => {
    try {
      await leaveEvent(eventId, token);
      const updatedEvents = await getEvents(token);
      setEvents(updatedEvents);
      closeModal();
    } catch (error) {
      console.error('Failed to leave event:', error);
    }
  };

  // Event filtering logic
  const filterEvents = () => {
    if (filter === 'all') {
      return events;
    } else if (filter === 'upcoming') {
      const now = new Date();
      return events.filter((event) => new Date(event.date) > now);
    } else if (filter === 'registered') {
      return events.filter((event) => event.is_participant === true);
    }
    return events;
  };

  const filteredEvents = filterEvents();

  // Show full-screen loading state if initial user data is loading
  if (isLoading) {
    return (
      <div className="loading">
        <div className="loader"></div>
        <p>Loading Events...</p>
      </div>
    );
  }

  if (!user) {
    return <div className="error-message">Unable to load user data. Please try again later.</div>;
  }

  return (
    <Layout user={user}>
      <div className="events-page">
        <div className="events-header">
          <div className="events-filters">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Events
            </button>
            <button
              className={`filter-btn ${filter === 'upcoming' ? 'active' : ''}`}
              onClick={() => setFilter('upcoming')}
            >
              Upcoming
            </button>
            <button
              className={`filter-btn ${filter === 'registered' ? 'active' : ''}`}
              onClick={() => setFilter('registered')}
            >
              My Events
            </button>
          </div>
        </div>

        <div className="events-section">
          {isEventsLoading ? (
            <div className="events-loading">
              <div className="loading-indicator">Loading events data...</div>
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="events-grid">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} onClick={handleCardClick} />
              ))}
            </div>
          ) : (
            <p className="no-events-message">No upcoming events found.</p>
          )}
        </div>

        {selectedEvent && (
          <EventModal
            event={selectedEvent}
            onClose={closeModal}
            onParticipate={handleParticipate}
            onNotParticipate={handleNotParticipate}
            currentUserId={user.id}
          />
        )}
      </div>
    </Layout>
  );
};

export default EventsPage;