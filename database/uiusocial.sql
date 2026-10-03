-- UIU Social Database Schema
-- Database Management System Project
-- Run this file to create the database and seed it with initial data

DROP DATABASE IF EXISTS uiusocial;
CREATE DATABASE uiusocial CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE uiusocial;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    student_id VARCHAR(20) DEFAULT NULL,
    password VARCHAR(255) NOT NULL,
    department VARCHAR(50) NOT NULL DEFAULT 'CSE',
    role ENUM('student', 'faculty', 'guest', 'admin') NOT NULL DEFAULT 'student',
    avatar VARCHAR(255) DEFAULT 'assets/images/students/default.png',
    cover_photo VARCHAR(255) DEFAULT NULL,
    about TEXT DEFAULT NULL,
    is_online TINYINT(1) DEFAULT 0,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- POSTS TABLE
-- ============================================
CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    group_id INT DEFAULT NULL,
    content TEXT NOT NULL,
    image VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- POST LIKES TABLE
-- ============================================
CREATE TABLE post_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_like (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    parent_id INT DEFAULT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- REPORTS TABLE
-- ============================================
CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    reported_by INT NOT NULL,
    reason VARCHAR(50) NOT NULL,
    reason_label VARCHAR(100) DEFAULT NULL,
    details TEXT DEFAULT NULL,
    status ENUM('pending', 'reviewed', 'dismissed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- CLUBS TABLE
-- ============================================
CREATE TABLE clubs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    image VARCHAR(255) DEFAULT NULL,
    icon VARCHAR(50) DEFAULT 'fa-puzzle-piece',
    icon_color VARCHAR(20) DEFAULT '#333',
    icon_bg VARCHAR(20) DEFAULT '#f5f5f5',
    cover_color VARCHAR(255) DEFAULT 'linear-gradient(135deg, #333, #666)',
    members_count INT DEFAULT 0,
    founded VARCHAR(50) DEFAULT NULL,
    advisor VARCHAR(100) DEFAULT NULL,
    about TEXT DEFAULT NULL,
    owner_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- CLUB TAGS TABLE
-- ============================================
CREATE TABLE club_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    club_id INT NOT NULL,
    tag VARCHAR(50) NOT NULL,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- CLUB ACTIVITIES TABLE
-- ============================================
CREATE TABLE club_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    club_id INT NOT NULL,
    activity VARCHAR(200) NOT NULL,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- CLUB POSTS TABLE
-- ============================================
CREATE TABLE club_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    club_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE club_post_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_club_like (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES club_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- CLUB POST COMMENTS TABLE
-- ============================================
CREATE TABLE club_post_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES club_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- CLUB MEMBERS TABLE
-- ============================================
CREATE TABLE club_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    club_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('member', 'admin', 'owner', 'requested') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_membership (club_id, user_id),
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- GROUPS TABLE
-- ============================================
CREATE TABLE groups_table (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT DEFAULT NULL,
    image VARCHAR(255) DEFAULT NULL,
    category VARCHAR(50) DEFAULT 'other',
    members_count INT DEFAULT 0,
    is_enrolled TINYINT(1) DEFAULT 0,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- GROUP MEMBERS TABLE
-- ============================================
CREATE TABLE group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('member', 'admin', 'requested') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_group_membership (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- EVENTS TABLE
-- ============================================
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT NULL,
    category VARCHAR(50) DEFAULT 'general',
    event_date DATE DEFAULT NULL,
    event_time TIME DEFAULT NULL,
    location VARCHAR(200) DEFAULT NULL,
    image VARCHAR(255) DEFAULT NULL,
    event_type ENUM('in_person', 'virtual') DEFAULT 'in_person',
    organizer VARCHAR(100) DEFAULT NULL,
    attendees_count INT DEFAULT 0,
    is_featured TINYINT(1) DEFAULT 0,
    created_by INT DEFAULT NULL,
    club_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- EVENT RSVPS TABLE
-- ============================================
CREATE TABLE event_rsvps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_rsvp (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    content TEXT DEFAULT NULL,
    message_type ENUM('text', 'file', 'image') DEFAULT 'text',
    file_name VARCHAR(255) DEFAULT NULL,
    file_size VARCHAR(50) DEFAULT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- BLOCKED USERS TABLE
-- ============================================
CREATE TABLE blocked_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    blocker_id INT NOT NULL,
    blocked_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_block (blocker_id, blocked_id),
    FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- VERIFICATION QUEUE TABLE
-- ============================================
CREATE TABLE verification_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    requested_role VARCHAR(50) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- MODERATION QUEUE TABLE
-- ============================================
CREATE TABLE moderation_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL,
    content_text TEXT DEFAULT NULL,
    report_category VARCHAR(50) NOT NULL,
    reported_by VARCHAR(100) DEFAULT NULL,
    target VARCHAR(100) DEFAULT NULL,
    status ENUM('pending', 'dismissed', 'deleted') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================
-- CONNECTIONS TABLE
-- ============================================
CREATE TABLE connections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    connected_user_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_connection (user_id, connected_user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (connected_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    created_by INT DEFAULT NULL,
    club_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE announcement_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    announcement_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_ann_like (announcement_id, user_id),
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE announcement_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    announcement_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    actor_id INT DEFAULT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT DEFAULT NULL,
    link VARCHAR(255) DEFAULT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_user_read (user_id, is_read),
    INDEX idx_notif_created (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================
-- SEED DATA: USERS
-- Passwords are bcrypt hash of 'password123'
-- ============================================
INSERT INTO users (id, name, email, student_id, password, department, role, avatar, about, is_online, status) VALUES
(1, 'Rafid Nahiyan Farabi', 'farabi@cse.uiu.ac.bd', NULL, '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CSE', 'faculty', '/assets/images/faculties/nahiyan-farabi.png', 'Cybersecurity expert and network architecture consultant. Mentoring capstone projects.', 0, 'approved'),
(2, 'Avijit Saha', 'asaha2430535@bscse.uiu.ac.bd', '0112430535', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CSE', 'student', '/assets/images/students/avijit.png', 'Teaching Web Architecture and Database Management. Focused on practical, project-based learning.', 1, 'approved'),
(3, 'Mahmudul Hasan Emon', 'semon2430105@bscse.uiu.ac.bd', '0112430105', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CSE', 'student', '/assets/images/students/emon.png', 'ReactJS and Tailwind CSS enthusiast. Always looking for the next hackathon.', 1, 'approved'),
(4, 'Molla Nabil Basar', 'mnabil2430xxx@bscee.uiu.ac.bd', '0112430444', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'EEE', 'student', '/assets/images/students/nabil.png', 'Hardware aficionado. Building IoT devices and robotics projects in my free time.', 0, 'approved'),
(5, 'Tamim Al Mitul', 'tamim2430xxx@bba.uiu.ac.bd', '0112430555', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'BBA', 'student', '/assets/images/students/mitul.png', 'Business major with a minor in tech. Organizing case competitions and networking events.', 1, 'approved'),
(6, 'Kawsar Ahmed', 'mahmed2430083@bscse.uiu.ac.bd', '0112430083', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CSE', 'admin', '/assets/images/students/kawsar.png', 'Passionate about building scalable web applications and exploring new technologies.', 1, 'approved'),
(7, 'Campus Guest', 'guest@uiu.ac.bd', NULL, '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CSE', 'guest', 'assets/images/students/default.png', 'Browsing UIU Social as a guest.', 0, 'approved');

-- ============================================
-- SEED DATA: POSTS
-- ============================================
INSERT INTO posts (id, user_id, content, image, created_at) VALUES
(1, 1, 'The registration for the upcoming Departmental Cybersecurity & Network Security Seminar is now officially open for all final-year students. Please ensure you secure your spot through the portal before Friday.', '/assets/images/post-img/cyber-security.png', NOW() - INTERVAL 2 HOUR),
(2, 6, 'Does anyone have the notes from the Web Programming lecture this morning? My laptop decided to update right as the teacher started.', NULL, NOW() - INTERVAL 4 HOUR),
(3, 2, 'Reminder for CSE 3rd year students: The deadline for submitting your Database Management Systems lab report has been extended to Sunday night.', NULL, NOW() - INTERVAL 5 HOUR),
(4, 3, 'Looking for team members for the upcoming Hackathon! Need someone with good knowledge of Tailwind CSS and ReactJS. DM me if interested.', NULL, NOW() - INTERVAL 6 HOUR),
(5, 4, 'Anyone in the EEE lab right now? Left my digital multimeter near workbench 4, please let me know if anyone spotted it.', NULL, NOW() - INTERVAL 8 HOUR),
(6, 5, 'The annual BBA Business Case Competition registration is closing tomorrow. Make sure your teams submit the executive summary on time!', 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80', NOW() - INTERVAL 12 HOUR),
(7, 1, 'Office hours for this week have been rescheduled to Thursday from 2:00 PM to 4:00 PM. Drop by if you need assistance with your capstone project proposals.', NULL, NOW() - INTERVAL 1 DAY),
(8, 2, 'Great energy at today''s Web Architecture workshop! Remember to review the REST API design guidelines before next week''s practical session.', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80', NOW() - INTERVAL 1 DAY),
(9, 3, 'Late-night coding setup for the weekend hackathon prep. React and Tailwind form a fantastic combination for building UI fast!', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80', NOW() - INTERVAL 2 DAY),
(10, 4, 'Finally completed the IoT sensor node assembly in the robotics lab. Temperature and humidity readings are streaming smoothly to MQTT.', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80', NOW() - INTERVAL 2 DAY),
(11, 6, 'Campus library is surprisingly peaceful this evening. Ideal environment to finish up algorithms reading.', 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80', NOW() - INTERVAL 3 DAY);

-- ============================================
-- SEED DATA: POST LIKES
-- ============================================
INSERT INTO post_likes (post_id, user_id) VALUES
(1, 2), (1, 3), (1, 4), (1, 5), (1, 6),
(2, 1), (2, 3), (2, 4),
(3, 1), (3, 3), (3, 6),
(4, 2), (4, 4),
(5, 5), (5, 3),
(6, 1), (6, 2), (6, 3), (6, 4),
(7, 2), (7, 4),
(8, 1), (8, 3), (8, 6),
(9, 1), (9, 2), (9, 5),
(10, 1), (10, 3),
(11, 2), (11, 4), (11, 3);

-- ============================================
-- SEED DATA: COMMENTS
-- ============================================
INSERT INTO comments (post_id, user_id, content, created_at) VALUES
(1, 3, 'Thank you sir! Is registration open for 3rd-year students as well?', NOW() - INTERVAL 110 MINUTE),
(1, 1, 'Currently it is restricted to final-year students only. If seats remain open after Thursday, we will extend it to 3rd-year students.', NOW() - INTERVAL 100 MINUTE),
(1, 4, 'Can EEE students join this seminar if seats are available?', NOW() - INTERVAL 90 MINUTE),
(2, 3, 'I wrote down the key points on Express.js routing. Check your inbox, I just sent the PDF.', NOW() - INTERVAL 200 MINUTE),
(2, 6, 'Got it! Thanks a lot man, saved my day.', NOW() - INTERVAL 190 MINUTE),
(3, 3, 'Thank you so much sir! This extension really helps with our ongoing midterms.', NOW() - INTERVAL 280 MINUTE),
(3, 2, 'You''re welcome. Make sure the ER diagrams are clearly drawn in the appendix section.', NOW() - INTERVAL 270 MINUTE),
(4, 4, 'I work mostly on backend (Node.js), but let me know if you need someone on the server side!', NOW() - INTERVAL 340 MINUTE),
(4, 3, 'That works great! Sent you a message.', NOW() - INTERVAL 330 MINUTE),
(5, 5, 'Saw a red multimeter at the lab attendant desk a few minutes ago. Might want to check there!', NOW() - INTERVAL 460 MINUTE),
(5, 4, 'Found it at the desk, thanks Tamim!', NOW() - INTERVAL 450 MINUTE),
(6, 3, 'Are inter-departmental teams allowed this year?', NOW() - INTERVAL 700 MINUTE),
(6, 5, 'Yes! Each team must have at least one BBA student, but other members can be from CSE or EEE.', NOW() - INTERVAL 690 MINUTE),
(7, 4, 'Sir, should we bring a printed draft of our proposal?', NOW() - INTERVAL 1400 MINUTE),
(7, 1, 'Yes, bringing a printed draft or having it ready on your laptop will speed things up.', NOW() - INTERVAL 1390 MINUTE),
(8, 6, 'The slide on middleware pattern was really clear. Will the presentation slides be uploaded to the portal?', NOW() - INTERVAL 1430 MINUTE),
(8, 2, 'Yes, I uploaded the deck to the course portal under Module 4.', NOW() - INTERVAL 1420 MINUTE),
(9, 5, 'Clean setup! What font family are you using in VS Code?', NOW() - INTERVAL 2800 MINUTE),
(9, 3, 'That is JetBrains Mono with ligatures enabled!', NOW() - INTERVAL 2790 MINUTE),
(10, 1, 'Nice work Nabil! Ensure you record power consumption metrics during active transmission.', NOW() - INTERVAL 2850 MINUTE),
(11, 4, 'Is the 3rd floor quiet zone open past 8 PM today?', NOW() - INTERVAL 4300 MINUTE),
(11, 6, 'Yes, open until 10 PM throughout midterm week.', NOW() - INTERVAL 4290 MINUTE);

-- ============================================
-- SEED DATA: CLUBS
-- ============================================
INSERT INTO clubs (id, name, slug, category, image, icon, icon_color, icon_bg, cover_color, members_count, founded, advisor, about, owner_id) VALUES
(1, 'App Forum', 'app-forum', 'Technology', 'assets/images/clubs/app-forum.png', 'fa-code', '#d32f2f', '#ffe8e8', 'linear-gradient(135deg, #d32f2f, #f06292)', 450, 'January 2021', 'Dr. Rafid Nahiyan Farabi', 'A collaborative platform for app developers at UIU. We discuss mobile and web application development, share project ideas, organize hackathons, and help each other build real-world skills.', 6),
(2, 'UIU Computer Club', 'uiu-computer-club', 'Technology', 'assets/images/clubs/computer-club.png', 'fa-desktop', '#e65100', '#fff3e0', 'linear-gradient(135deg, #e65100, #ffa726)', 1200, 'March 2015', 'Dr. Avijit Saha', 'The largest and most prestigious club at UIU. UIU Computer Club (UIUCC) drives innovation through programming contests, seminars, and tech workshops. We nurture future software engineers and tech leaders.', 2),
(3, 'Cultural Club', 'cultural-club', 'Arts & Culture', 'assets/images/clubs/cultural-club.png', 'fa-masks-theater', '#2e7d32', '#e8f5e9', 'linear-gradient(135deg, #2e7d32, #66bb6a)', 850, 'August 2018', 'Prof. Shamima Akhter', 'The Cultural Club of UIU celebrates the rich heritage and diversity of Bangladeshi culture. We organize music, drama, dance, and poetry events that enrich campus life and foster creativity.', 5),
(4, 'Robotics Club', 'robotics-club', 'Technology', 'assets/images/clubs/robotics-club.png', 'fa-robot', '#1565c0', '#e3f2fd', 'linear-gradient(135deg, #1565c0, #42a5f5)', 320, 'June 2019', 'Dr. Karim Hossain', 'The UIU Robotics Lab is where hardware meets software. We build autonomous robots, IoT devices, and embedded systems. Members compete in national and international robotics competitions.', 4),
(5, 'UIU Debate Club', 'debate-club', 'Academic', 'assets/images/clubs/debate-club.png', 'fa-comments', '#c62828', '#ffebee', 'linear-gradient(135deg, #c62828, #ef5350)', 520, 'October 2017', 'Dr. Rezwanul Huque', 'UIU Debate Club (UIUDC) is dedicated to promoting logic, critical thinking, public speaking, and parliamentary debate skills among students.', 2),
(6, 'Sports Club', 'sports-club', 'Sports', 'assets/images/clubs/sports-club.png', 'fa-trophy', '#00897b', '#e0f2f1', 'linear-gradient(135deg, #00897b, #4db6ac)', 950, 'February 2016', 'Prof. Tareq Rahman', 'UIU Sports Club brings together athletes and sports enthusiasts across campus. We organize tournaments, foster teamwork, and promote fitness.', 5);

-- ============================================
-- SEED DATA: CLUB TAGS
-- ============================================
INSERT INTO club_tags (club_id, tag) VALUES
(1, 'Mobile Dev'), (1, 'Web Dev'), (1, 'Hackathon'), (1, 'UI/UX'),
(2, 'Competitive Programming'), (2, 'Seminars'), (2, 'CP Contests'), (2, 'Tech Talks'),
(3, 'Music'), (3, 'Drama'), (3, 'Dance'), (3, 'Poetry'), (3, 'Photography'),
(4, 'Robotics'), (4, 'IoT'), (4, 'Arduino'), (4, 'Raspberry Pi'), (4, 'AI'),
(5, 'Debate'), (5, 'Public Speaking'), (5, 'Parliamentary'), (5, 'Logic'),
(6, 'Cricket'), (6, 'Football'), (6, 'Table Tennis'), (6, 'Chess'), (6, 'Badminton');

-- ============================================
-- SEED DATA: CLUB ACTIVITIES
-- ============================================
INSERT INTO club_activities (club_id, activity) VALUES
(1, 'Monthly App Showcase'), (1, 'Weekly Dev Talks'), (1, 'Inter-university Hackathon'),
(2, 'ICPC Training'), (2, 'National Collegiate Programming Contest'), (2, 'Annual Tech Symposium'),
(3, 'Annual Cultural Festival'), (3, 'Photography Contest'), (3, 'Drama Competitions'), (3, 'Bangla New Year Celebration'),
(4, 'RoboFest Competition'), (4, '3D Printing Workshops'), (4, 'Arduino Bootcamp'), (4, 'Inter-university Robot Wars'),
(5, 'Inter-University National Debate'), (5, 'Weekly Public Speaking Sessions'), (5, 'Freshers Debate Workshop'),
(6, 'UIU Champions League'), (6, 'Annual Sports Indoor Tournament'), (6, 'Inter-University Football Championship');

-- ============================================
-- SEED DATA: CLUB POSTS
-- ============================================
INSERT INTO club_posts (club_id, user_id, content, likes_count, comments_count, created_at) VALUES
(1, 6, 'Just finished the prototype for our new campus map app! Sharing a sneak peek below. Feedback welcome!', 34, 8, NOW() - INTERVAL 2 HOUR),
(1, 3, 'Great session today on React Native! The recording will be uploaded to the drive by tonight.', 51, 12, NOW() - INTERVAL 6 HOUR),
(2, 2, 'The ICPC Regional 2024 practice sessions begin this Saturday. All registered members please confirm attendance.', 98, 23, NOW() - INTERVAL 1 DAY),
(2, 4, 'Finished 3rd in the inter-university CP contest! Huge thanks to the club for the training!', 145, 31, NOW() - INTERVAL 2 DAY),
(3, 5, 'Registrations for the Autumn Cultural Fest drama competition are now OPEN! Sign up before October 1st.', 67, 18, NOW() - INTERVAL 3 HOUR),
(3, 6, 'The photography contest results are out! Check the noticeboard. Amazing work everyone!', 112, 29, NOW() - INTERVAL 1 DAY),
(4, 4, 'New 3D Printers arrived! Three brand-new Bambu Lab machines are now in the lab. Orientation this Friday.', 42, 13, NOW() - INTERVAL 2 HOUR),
(4, 3, 'Our team placed 2nd in the National RoboFest 2024! Super proud of everyone who put in the work!', 189, 47, NOW() - INTERVAL 5 HOUR),
(5, 2, 'The registration for the upcoming Inter University National Debate Competition is now open. Team formation meetings at Room 402.', 89, 5, NOW() - INTERVAL 5 HOUR),
(6, 5, 'Fixtures for the UIU Cricket Premier League are out! Check the tournament schedule on the noticeboard.', 104, 15, NOW() - INTERVAL 4 HOUR);

-- ============================================
-- SEED DATA: GROUPS
-- ============================================
INSERT INTO groups_table (id, name, description, image, category, members_count, is_enrolled, created_by) VALUES
(1, 'CSE Batch 243 Official', 'The main hub for CSE Batch 24 students. Discuss exams, course registrations, and upcoming events.', 'assets/images/uiu/uiu-cse.png', 'cs', 452, 1, 6),
(2, 'Robotics Club Core', 'Project discussion and technical support for robotics competition teams.', '/assets/images/groups/robotics.png', 'cs,ee', 86, 0, 4),
(3, 'DBMS Section B', 'Specifically for student enrolled in CSE411 Section B. Group project coordination.', '/assets/images/groups/dbms.png', 'cs', 42, 1, 2),
(4, 'AI & Machine Learning', 'Advanced research discussion and paper reading group for senior students.', '/assets/images/groups/ml.png', 'cs', 215, 0, 3),
(5, 'Algorithms Course Group', 'Collaborative study group for CSE301. Weekly problem solving and resource sharing.', '/assets/images/groups/dsa.png', 'cs', 128, 0, 2);

-- ============================================
-- SEED DATA: EVENTS
-- ============================================
INSERT INTO events (id, title, description, category, event_date, event_time, location, image, event_type, organizer, attendees_count, is_featured, created_by) VALUES
(1, 'Navigating the Future of AI in Modern Engineering', 'Join us for an exclusive keynote featuring industry pioneers from Silicon Valley as they discuss the integration of artificial intelligence in engineering practices and what it means for upcoming graduates.', 'seminar', '2026-10-24', '10:00:00', 'Main Auditorium', NULL, 'in_person', 'IEEE Student Branch', 245, 1, 1),
(2, 'Web Development Hackathon 2026', 'A 24-hour intense coding session to build solutions for campus problems.', 'workshop', '2026-10-28', '09:00:00', 'CS Lab', '/assets/images/uiu/web-hackathon.png', 'in_person', 'App Forum', 0, 0, 6),
(3, 'Data Science: Myths vs Reality', 'Understanding what the industry actually looks for in junior data scientists.', 'webinar', '2026-11-02', '18:00:00', 'Virtual', '/assets/images/uiu/myth-reality.png', 'virtual', 'Computer Club', 0, 0, 2),
(4, 'Annual University Club Fair', 'Discover over 50+ clubs and organizations to join and make your campus life memorable.', 'social', '2026-11-15', '10:00:00', 'Campus Plaza', '/assets/images/uiu/club-fair.png', 'in_person', 'Student Affairs', 0, 0, 1),
(5, 'Emerging Trends in Smart Grid Technology', 'Specialized seminar for senior year engineering students.', 'seminar', '2026-12-05', '14:00:00', 'Seminar Hall B', NULL, 'in_person', 'EEE Dept', 0, 0, 1),
(6, 'Quantum Computing: The Next Frontier', 'Introduction to qubit mechanics and quantum algorithms.', 'seminar', '2026-12-08', '10:00:00', 'Virtual Room 4', NULL, 'virtual', 'CSE Dept', 0, 0, 1);

-- ============================================
-- SEED DATA: MESSAGES
-- ============================================
INSERT INTO messages (sender_id, receiver_id, content, message_type, file_name, file_size, is_read, created_at) VALUES
(1, 6, 'Hello! I''ve had a chance to look over your initial proposal for the AI Ethics seminar. It''s a very robust start.', 'text', NULL, NULL, 1, NOW() - INTERVAL 3 HOUR),
(6, 1, 'Thank you, Sir. I was concerned about the section regarding algorithmic bias, do you think it needs more empirical data?', 'text', NULL, NULL, 1, NOW() - INTERVAL 2 HOUR),
(1, 6, 'The draft for the research paper looks promising. Let''s actually strengthen that section. I''ve attached some relevant case studies from the MIT lab that might help.', 'file', 'MIT_AI_Ethics_Case_Study.pdf', '2.4 MB', 0, NOW() - INTERVAL 1 HOUR),
(2, 6, 'Are we still meeting at the Lab for the project?', 'text', NULL, NULL, 0, NOW() - INTERVAL 1 DAY);

-- ============================================
-- SEED DATA: VERIFICATION QUEUE
-- ============================================
-- verification_queue starts empty; new registrations are inserted here

-- ============================================
-- SEED DATA: MODERATION QUEUE
-- ============================================
INSERT INTO moderation_queue (content_type, content_text, report_category, reported_by, target, status, created_at) VALUES
('post', 'Check out this link for cheap textbooks, 100% legit and approved by the board...', 'SPAM / ADVERTISING', 'S. Ahmed', NULL, 'pending', NOW() - INTERVAL 2 MINUTE),
('comment', 'Targeted comments on a club event post.', 'HARASSMENT', NULL, 'Robotics Club', 'pending', NOW() - INTERVAL 15 MINUTE),
('post', 'Sharing of unreleased department research papers without proper faculty authorization.', 'COPYRIGHT', NULL, 'CSE Dept', 'pending', NOW() - INTERVAL 1 HOUR);

-- ============================================
-- SEED DATA: ANNOUNCEMENTS
-- ============================================
INSERT INTO announcements (title, content, created_by, club_id) VALUES
('Midterm Schedule Released', 'Check the student portal for the revised schedule.', 1, NULL),
('Library 24/7 Access', 'Extended hours begin next Monday for the exam period.', 1, NULL),
('New 3D Printers arrived!', 'We are excited to announce that the lab has received three new Bambu Lab printers. Orientation for new members starts this Friday.', 4, 4),
('Regional Qualifiers Registration', 'The registration for the upcoming Inter University National Debate Competition is now open. Team formation meetings at Room 402.', 2, 5),
('Autumn App Showcase', 'Submit your prototype by next Wednesday to present at the monthly App Forum showcase.', 6, 1);

INSERT INTO group_members (group_id, user_id, role) VALUES
(1, 6, 'admin'), (3, 6, 'member'), (1, 2, 'member'), (1, 3, 'member'), (3, 2, 'admin');

INSERT INTO club_members (club_id, user_id, role) VALUES
(1, 6, 'owner'), (2, 2, 'owner'), (3, 5, 'owner'), (4, 4, 'owner'), (5, 2, 'owner'), (6, 5, 'owner'),
(1, 3, 'member'), (2, 6, 'member'), (4, 3, 'member');

INSERT INTO events (title, description, category, event_date, event_time, location, image, event_type, organizer, attendees_count, is_featured, created_by, club_id) VALUES
('Robotics Workshop 101', 'Hands-on intro to sensors, motors, and Arduino for new members.', 'workshop', '2026-09-12', '14:00:00', 'Main Auditorium', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=500&q=80', 'in_person', 'Robotics Club', 47, 0, 4, 4),
('Inter University Debate Qualifiers', 'Team formation and briefing for the national debate competition.', 'academic', '2026-10-05', '16:00:00', 'Room 402', NULL, 'in_person', 'UIU Debate Club', 32, 0, 2, 5),
('App Forum Hack Night', 'Overnight prototyping session for campus utility apps.', 'workshop', '2026-10-18', '18:00:00', 'CS Lab', '/assets/images/uiu/web-hackathon.png', 'in_person', 'App Forum', 28, 0, 6, 1);

-- ============================================
-- SEED DATA: CONNECTIONS
-- ============================================
INSERT INTO connections (user_id, connected_user_id, status) VALUES
(6, 1, 'accepted'),
(6, 2, 'accepted'),
(6, 3, 'accepted'),
(6, 4, 'accepted'),
(6, 5, 'accepted'),
(2, 3, 'accepted'),
(3, 4, 'accepted');

-- ============================================
-- NEW TABLES
-- ============================================

-- Password Resets
CREATE TABLE password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (token)
) ENGINE=InnoDB;

-- Post Saves (Bookmarks)
CREATE TABLE post_saves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_save (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Comment Likes
CREATE TABLE comment_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    comment_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_comment_like (comment_id, user_id),
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Follows
CREATE TABLE follows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_follow (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- User Settings
CREATE TABLE user_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message_privacy ENUM('everyone','connections','none') DEFAULT 'everyone',
    post_privacy ENUM('everyone','connections','none') DEFAULT 'everyone',
    email_notifications TINYINT(1) DEFAULT 1,
    push_notifications TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_settings (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Admin Logs
CREATE TABLE admin_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id INT NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Message Reads
CREATE TABLE message_reads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL,
    user_id INT NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_read (message_id, user_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================
-- ALTER TABLES (add new columns)
-- ============================================
ALTER TABLE posts ADD COLUMN edited_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE posts ADD COLUMN views_count INT DEFAULT 0;
ALTER TABLE posts ADD COLUMN shares_count INT DEFAULT 0;

ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE users ADD COLUMN is_banned TINYINT(1) DEFAULT 0;
ALTER TABLE users ADD COLUMN banned_reason TEXT;
ALTER TABLE users ADD COLUMN banned_until TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE comments ADD COLUMN edited_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE comments ADD COLUMN likes_count INT DEFAULT 0;

ALTER TABLE groups_table ADD COLUMN is_private TINYINT(1) DEFAULT 0;
ALTER TABLE groups_table ADD COLUMN rules TEXT;
ALTER TABLE groups_table ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE clubs ADD COLUMN is_verified TINYINT(1) DEFAULT 0;
ALTER TABLE clubs ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE events ADD COLUMN max_attendees INT DEFAULT NULL;
ALTER TABLE events ADD COLUMN registration_deadline TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE events ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL;
