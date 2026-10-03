<?php
require_once __DIR__ . '/../config/helpers.php';

header('Content-Type: application/json');

$db = getDB();

function ensureColumn(PDO $db, $table, $column, $definition) {
    if (!columnExists($db, $table, $column)) {
        $db->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
    }
}

try {
    $db->exec("ALTER TABLE users MODIFY COLUMN role ENUM('student','faculty','guest','admin') NOT NULL DEFAULT 'student'");
} catch (Exception $e) {}

ensureColumn($db, 'users', 'status', "ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved'");
ensureColumn($db, 'users', 'cover_photo', "VARCHAR(255) DEFAULT NULL");

ensureColumn($db, 'posts', 'group_id', "INT DEFAULT NULL");
ensureColumn($db, 'comments', 'parent_id', "INT DEFAULT NULL");
ensureColumn($db, 'clubs', 'owner_id', "INT DEFAULT NULL");
ensureColumn($db, 'events', 'club_id', "INT DEFAULT NULL");
ensureColumn($db, 'announcements', 'club_id', "INT DEFAULT NULL");

if (!tableExists($db, 'notifications')) {
    $db->exec("
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
        ) ENGINE=InnoDB
    ");
} else {
    ensureColumn($db, 'notifications', 'actor_id', "INT DEFAULT NULL");
    try { $db->exec("ALTER TABLE notifications ADD INDEX idx_notif_user_read (user_id, is_read)"); } catch (Exception $e) {}
    try { $db->exec("ALTER TABLE notifications ADD INDEX idx_notif_created (created_at)"); } catch (Exception $e) {}
}

if (!tableExists($db, 'verification_queue')) {
    $db->exec("
        CREATE TABLE verification_queue (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            requested_role VARCHAR(50) NOT NULL,
            status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
    ");
}

if (!tableExists($db, 'connections')) {
    $db->exec("
        CREATE TABLE connections (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            connected_user_id INT NOT NULL,
            status ENUM('pending', 'accepted') NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_conn (user_id, connected_user_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (connected_user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
    ");
}

if (!tableExists($db, 'messages')) {
    $db->exec("
        CREATE TABLE messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender_id INT NOT NULL,
            receiver_id INT NOT NULL,
            content TEXT NOT NULL,
            message_type VARCHAR(20) DEFAULT 'text',
            is_read TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
    ");
}

if (!tableExists($db, 'blocked_users')) {
    $db->exec("
        CREATE TABLE blocked_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            blocker_id INT NOT NULL,
            blocked_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_block (blocker_id, blocked_id),
            FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
    ");
}

if (!tableExists($db, 'announcement_likes')) {
    $db->exec("
        CREATE TABLE announcement_likes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            announcement_id INT NOT NULL,
            user_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_ann_like (announcement_id, user_id),
            FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
    ");
}

if (!tableExists($db, 'announcement_comments')) {
    $db->exec("
        CREATE TABLE announcement_comments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            announcement_id INT NOT NULL,
            user_id INT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
    ");
}

try {
    $db->exec("ALTER TABLE club_members MODIFY COLUMN role ENUM('member','admin','owner','requested') DEFAULT 'member'");
} catch (Exception $e) {}

$db->exec("UPDATE users SET status = 'approved' WHERE status IS NULL OR status = ''");
$clubOwnerMap = [1 => 6, 2 => 2, 3 => 5, 4 => 4, 5 => 2, 6 => 5];
foreach ($clubOwnerMap as $clubId => $ownerId) {
    try {
        $exists = $db->prepare("SELECT 1 FROM users WHERE id = ?");
        $exists->execute([$ownerId]);
        if (!$exists->fetch()) continue;
        $db->prepare("UPDATE clubs SET owner_id = ? WHERE id = ? AND owner_id IS NULL")->execute([$ownerId, $clubId]);
    } catch (Exception $e) {}
}

$memberCount = $db->query("SELECT COUNT(*) AS c FROM group_members")->fetch()['c'];
if ((int) $memberCount === 0) {
    $db->exec("INSERT IGNORE INTO group_members (group_id, user_id, role) VALUES (1,6,'admin'),(3,6,'member'),(1,2,'member'),(1,3,'member'),(3,2,'admin')");
}

$clubMemberCount = $db->query("SELECT COUNT(*) AS c FROM club_members")->fetch()['c'];
if ((int) $clubMemberCount === 0) {
    $db->exec("INSERT IGNORE INTO club_members (club_id, user_id, role) VALUES
        (1,6,'owner'),(2,2,'owner'),(3,5,'owner'),(4,4,'owner'),(5,2,'owner'),(6,5,'owner'),
        (1,3,'member'),(2,6,'member'),(4,3,'member')");
}

$clubEventCount = $db->query("SELECT COUNT(*) AS c FROM events WHERE club_id IS NOT NULL")->fetch()['c'];
if ((int) $clubEventCount === 0) {
    $db->exec("INSERT INTO events (title, description, category, event_date, event_time, location, image, event_type, organizer, attendees_count, is_featured, created_by, club_id) VALUES
        ('Robotics Workshop 101', 'Hands-on intro to sensors, motors, and Arduino for new members.', 'workshop', '2026-09-12', '14:00:00', 'Main Auditorium', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=500&q=80', 'in_person', 'Robotics Club', 47, 0, 4, 4),
        ('Inter University Debate Qualifiers', 'Team formation and briefing for the national debate competition.', 'academic', '2026-10-05', '16:00:00', 'Room 402', NULL, 'in_person', 'UIU Debate Club', 32, 0, 2, 5),
        ('App Forum Hack Night', 'Overnight prototyping session for campus utility apps.', 'workshop', '2026-10-18', '18:00:00', 'CS Lab', '/assets/images/uiu/web-hackathon.png', 'in_person', 'App Forum', 28, 0, 6, 1)");
}

$clubAnnCount = $db->query("SELECT COUNT(*) AS c FROM announcements WHERE club_id IS NOT NULL")->fetch()['c'];
if ((int) $clubAnnCount === 0) {
    $db->exec("INSERT INTO announcements (title, content, created_by, club_id) VALUES
        ('New 3D Printers arrived!', 'We are excited to announce that the lab has received three new Bambu Lab printers. Orientation for new members starts this Friday.', 4, 4),
        ('Regional Qualifiers Registration', 'The registration for the upcoming Inter University National Debate Competition is now open. Team formation meetings at Room 402.', 2, 5),
        ('Autumn App Showcase', 'Submit your prototype by next Wednesday to present at the monthly App Forum showcase.', 6, 1)");
}

echo json_encode(['success' => true, 'message' => 'Database migrated']);

// Indoor Navigation Map tables (UIU 2nd floor)
if (!tableExists($db, 'floor_nodes')) {
    $db->exec("
        CREATE TABLE floor_nodes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            floor_level INT NOT NULL DEFAULT 2,
            node_name VARCHAR(100) NOT NULL,
            node_type ENUM('lift', 'stair', 'room', 'corridor') NOT NULL DEFAULT 'corridor',
            x_pos INT NOT NULL,
            y_pos INT NOT NULL,
            INDEX idx_floor_level (floor_level),
            INDEX idx_node_type (node_type)
        ) ENGINE=InnoDB
    ");
}

if (!tableExists($db, 'floor_connections')) {
    $db->exec("
        CREATE TABLE floor_connections (
            id INT AUTO_INCREMENT PRIMARY KEY,
            from_node_id INT NOT NULL,
            to_node_id INT NOT NULL,
            distance DECIMAL(8,2) NOT NULL,
            INDEX idx_from (from_node_id),
            INDEX idx_to (to_node_id),
            UNIQUE KEY unique_edge (from_node_id, to_node_id)
        ) ENGINE=InnoDB
    ");
}

$nodeCount = $db->query("SELECT COUNT(*) AS c FROM floor_nodes")->fetch()['c'];
if ((int)$nodeCount === 0) {
    $db->exec("INSERT INTO floor_nodes (id, floor_level, node_name, node_type, x_pos, y_pos) VALUES
        (1, 2, 'Main Entrance Lobby', 'corridor', 1536, 1024),
        (2, 2, 'Lift', 'lift', 512, 1024),
        (3, 2, 'Main Stairs', 'stair', 512, 512),
        (4, 2, 'Reception Desk', 'room', 1536, 600),
        (5, 2, 'Corridor Junction West', 'corridor', 768, 2048),
        (6, 2, 'Classroom 220', 'room', 600, 2560),
        (7, 2, 'Computer Lab 221', 'room', 900, 2560),
        (8, 2, 'Classroom 223', 'room', 1200, 2560),
        (9, 2, 'Faculty Offices', 'room', 1500, 2560),
        (10, 2, 'Corridor Junction Center', 'corridor', 1536, 2048),
        (11, 2, 'Lecture Hall A', 'room', 1800, 2560),
        (12, 2, 'Seminar Room', 'room', 2100, 2560),
        (13, 2, 'Restroom', 'room', 2400, 2560),
        (14, 2, 'Corridor Junction East', 'corridor', 2400, 2048),
        (15, 2, 'Library Reading Area', 'corridor', 2750, 2048),
        (16, 2, 'East Elevator Lobby', 'corridor', 2750, 1024)");

    $db->exec("INSERT INTO floor_connections (from_node_id, to_node_id, distance) VALUES
        (1, 2, 20), (2, 1, 20),
        (1, 3, 24), (3, 1, 24),
        (1, 4, 8), (4, 1, 8),
        (1, 10, 20), (10, 1, 20),
        (1, 16, 24), (16, 1, 24),
        (2, 3, 10), (3, 2, 10),
        (2, 5, 21), (5, 2, 21),
        (3, 4, 20), (4, 3, 20),
        (5, 6, 11), (6, 5, 11),
        (5, 7, 11), (7, 5, 11),
        (5, 10, 15), (10, 5, 15),
        (6, 7, 6), (7, 6, 6),
        (7, 8, 6), (8, 7, 6),
        (8, 9, 6), (9, 8, 6),
        (9, 10, 10), (10, 9, 10),
        (10, 11, 12), (11, 10, 12),
        (10, 14, 17), (14, 10, 17),
        (11, 12, 6), (12, 11, 6),
        (12, 13, 6), (13, 12, 6),
        (13, 14, 10), (14, 13, 10),
        (14, 15, 7), (15, 14, 7),
        (14, 16, 22), (16, 14, 22),
        (15, 16, 20), (16, 15, 20)");
}

// New tables
if (!tableExists($db, 'password_resets')) {
    $db->exec("CREATE TABLE password_resets (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(150) NOT NULL, token VARCHAR(255) NOT NULL, expires_at TIMESTAMP NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX idx_token (token)) ENGINE=InnoDB");
}
if (!tableExists($db, 'post_saves')) {
    $db->exec("CREATE TABLE post_saves (id INT AUTO_INCREMENT PRIMARY KEY, post_id INT NOT NULL, user_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY unique_save (post_id, user_id), FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB");
}
if (!tableExists($db, 'comment_likes')) {
    $db->exec("CREATE TABLE comment_likes (id INT AUTO_INCREMENT PRIMARY KEY, comment_id INT NOT NULL, user_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY unique_comment_like (comment_id, user_id), FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB");
}
if (!tableExists($db, 'follows')) {
    $db->exec("CREATE TABLE follows (id INT AUTO_INCREMENT PRIMARY KEY, follower_id INT NOT NULL, following_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY unique_follow (follower_id, following_id), FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB");
}
if (!tableExists($db, 'user_settings')) {
    $db->exec("CREATE TABLE user_settings (id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL, message_privacy ENUM('everyone','connections','none') DEFAULT 'everyone', post_privacy ENUM('everyone','connections','none') DEFAULT 'everyone', email_notifications TINYINT(1) DEFAULT 1, push_notifications TINYINT(1) DEFAULT 1, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY unique_settings (user_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB");
}
if (!tableExists($db, 'admin_logs')) {
    $db->exec("CREATE TABLE admin_logs (id INT AUTO_INCREMENT PRIMARY KEY, admin_id INT NOT NULL, action VARCHAR(100) NOT NULL, target_type VARCHAR(50) NOT NULL, target_id INT NOT NULL, details TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB");
}
if (!tableExists($db, 'message_reads')) {
    $db->exec("CREATE TABLE message_reads (id INT AUTO_INCREMENT PRIMARY KEY, message_id INT NOT NULL, user_id INT NOT NULL, read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY unique_read (message_id, user_id), FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB");
}

if (!tableExists($db, 'club_post_likes')) {
    $db->exec("CREATE TABLE club_post_likes (id INT AUTO_INCREMENT PRIMARY KEY, post_id INT NOT NULL, user_id INT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY unique_club_like (post_id, user_id), FOREIGN KEY (post_id) REFERENCES club_posts(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB");
}
if (!tableExists($db, 'club_post_comments')) {
    $db->exec("CREATE TABLE club_post_comments (id INT AUTO_INCREMENT PRIMARY KEY, post_id INT NOT NULL, user_id INT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (post_id) REFERENCES club_posts(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) ENGINE=InnoDB");
}

// Add new columns
ensureColumn($db, 'posts', 'edited_at', 'TIMESTAMP NULL DEFAULT NULL');
ensureColumn($db, 'posts', 'views_count', 'INT DEFAULT 0');
ensureColumn($db, 'posts', 'shares_count', 'INT DEFAULT 0');
ensureColumn($db, 'users', 'last_seen_at', 'TIMESTAMP NULL DEFAULT NULL');
ensureColumn($db, 'users', 'is_banned', "TINYINT(1) DEFAULT 0");
ensureColumn($db, 'users', 'banned_reason', 'TEXT');
ensureColumn($db, 'users', 'banned_until', 'TIMESTAMP NULL DEFAULT NULL');
ensureColumn($db, 'comments', 'edited_at', 'TIMESTAMP NULL DEFAULT NULL');
ensureColumn($db, 'comments', 'likes_count', 'INT DEFAULT 0');
ensureColumn($db, 'groups_table', 'is_private', "TINYINT(1) DEFAULT 0");
ensureColumn($db, 'groups_table', 'rules', 'TEXT');
ensureColumn($db, 'groups_table', 'updated_at', 'TIMESTAMP NULL DEFAULT NULL');
ensureColumn($db, 'clubs', 'is_verified', "TINYINT(1) DEFAULT 0");
ensureColumn($db, 'clubs', 'updated_at', 'TIMESTAMP NULL DEFAULT NULL');
ensureColumn($db, 'events', 'max_attendees', 'INT DEFAULT NULL');
ensureColumn($db, 'events', 'registration_deadline', 'TIMESTAMP NULL DEFAULT NULL');
ensureColumn($db, 'events', 'updated_at', 'TIMESTAMP NULL DEFAULT NULL');

// Real-time chat: attachment metadata, edit tracking and thread pagination index
ensureColumn($db, 'messages', 'file_path', 'VARCHAR(500) DEFAULT NULL');
ensureColumn($db, 'messages', 'file_mime', 'VARCHAR(150) DEFAULT NULL');
ensureColumn($db, 'messages', 'reply_to', 'INT DEFAULT NULL');
ensureColumn($db, 'messages', 'edited_at', 'TIMESTAMP NULL DEFAULT NULL');
try { $db->exec("ALTER TABLE messages ADD INDEX idx_thread (sender_id, receiver_id, id)"); } catch (Exception $e) {}
try { $db->exec("ALTER TABLE messages MODIFY COLUMN message_type ENUM('text','image','file') NOT NULL DEFAULT 'text'"); } catch (Exception $e) {}
