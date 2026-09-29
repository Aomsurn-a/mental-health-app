const db = require('../config/db');

// Users can initiate contact with an active psychologist. Psychologists can
// reply to an existing conversation or contact a patient with an appointment.
async function canChat(actorId, partnerId) {
  const [rows] = await db.query(
    `SELECT 1 FROM users me JOIN users peer ON peer.id = ?
     WHERE me.id = ? AND me.active_flag = 1 AND peer.active_flag = 1
       AND me.status = 'active' AND peer.status = 'active'
       AND (
         (me.role = 'user' AND peer.role = 'psychologist'
          AND EXISTS (SELECT 1 FROM psychologists p WHERE p.user_id = peer.id AND p.active_flag = 1))
         OR (me.role = 'psychologist' AND peer.role = 'user'
          AND EXISTS (SELECT 1 FROM psychologists p WHERE p.user_id = me.id AND p.active_flag = 1)
          AND (
            EXISTS (SELECT 1 FROM appointments a JOIN psychologists p ON p.id = a.psychologist_id
                    WHERE p.user_id = me.id AND a.user_id = peer.id AND a.active_flag = 1
                      AND a.status IN ('pending','approved','completed'))
            OR EXISTS (SELECT 1 FROM chat_messages m WHERE m.active_flag = 1
                       AND ((m.sender_id = me.id AND m.receiver_id = peer.id)
                         OR (m.sender_id = peer.id AND m.receiver_id = me.id)))
          ))
       ) LIMIT 1`,
    [partnerId, actorId]
  );
  return rows.length > 0;
}

const validId = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;
module.exports = { canChat, validId };
