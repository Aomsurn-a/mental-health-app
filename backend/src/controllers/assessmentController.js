const db = require('../config/db');

// ฟังก์ชันคำนวณผลและแปลความหมาย
const interpretResult = (setId, score) => {
  switch (setId) {
    case 1: // ST-5
      if (score <= 4) return { risk_level: 'low', recommendation: 'ความเครียดน้อย ดูแลสุขภาพจิตต่อไปด้วยการพักผ่อนให้เพียงพอและออกกำลังกายสม่ำเสมอ' };
      if (score <= 7) return { risk_level: 'medium', recommendation: 'ความเครียดปานกลาง ควรหาวิธีผ่อนคลายความเครียด เช่น การออกกำลังกาย นั่งสมาธิ หรือทำกิจกรรมที่ชื่นชอบ' };
      if (score <= 9) return { risk_level: 'high', recommendation: 'ความเครียดมาก ควรปรึกษาผู้เชี่ยวชาญด้านสุขภาพจิตเพื่อรับคำแนะนำ' };
      return { risk_level: 'critical', recommendation: 'ความเครียดมากที่สุด ควรพบนักจิตวิทยาหรือจิตแพทย์โดยเร็ว' };

    case 2: // 2Q
      if (score === 0) return { risk_level: 'low', recommendation: 'ไม่มีอาการซึมเศร้า ดูแลสุขภาพจิตต่อไป' };
      return { risk_level: 'medium', recommendation: 'มีความเสี่ยงเป็นโรคซึมเศร้า ควรทำแบบประเมิน 9Q เพิ่มเติม' };

    case 3: // 9Q
      if (score <= 6) return { risk_level: 'low', recommendation: 'ไม่มีภาวะซึมเศร้า ดูแลสุขภาพจิตต่อไป' };
      if (score <= 12) return { risk_level: 'medium', recommendation: 'มีภาวะซึมเศร้าระดับน้อย ควรปรึกษาผู้เชี่ยวชาญและทำแบบประเมิน 8Q เพิ่มเติม' };
      if (score <= 18) return { risk_level: 'high', recommendation: 'มีภาวะซึมเศร้าระดับปานกลาง ควรพบจิตแพทย์เพื่อรับการตรวจวินิจฉัย' };
      return { risk_level: 'critical', recommendation: 'มีภาวะซึมเศร้าระดับรุนแรง ควรพบจิตแพทย์โดยด่วน' };

    case 4: // 8Q
      if (score === 0) return { risk_level: 'low', recommendation: 'ไม่มีแนวโน้มจะฆ่าตัวตาย' };
      if (score <= 8) return { risk_level: 'medium', recommendation: 'มีแนวโน้มระดับน้อย ควรปรึกษาผู้เชี่ยวชาญด้านสุขภาพจิต' };
      if (score <= 16) return { risk_level: 'high', recommendation: 'มีแนวโน้มระดับปานกลาง ควรพบจิตแพทย์และมีผู้ดูแลอย่างใกล้ชิด' };
      return { risk_level: 'critical', recommendation: 'มีแนวโน้มระดับรุนแรง ควรเข้ารับการรักษาในโรงพยาบาลทันที' };

    default:
      return { risk_level: 'low', recommendation: '' };
  }
};

const assessmentController = {

  // ดึงรายการชุดประเมินทั้งหมด
  getSets: async (req, res) => {
    try {
      const [sets] = await db.query(
        'SELECT id, name, description FROM assessment_sets WHERE active_flag = 1 ORDER BY id'
      );
      res.json(sets);
    } catch (error) {
      console.error('GetSets error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดึงคำถามตามชุด
  getSetById: async (req, res) => {
    try {
      const { id } = req.params;

      const [sets] = await db.query(
        'SELECT id, name, description FROM assessment_sets WHERE id = ? AND active_flag = 1',
        [id]
      );
      if (sets.length === 0) {
        return res.status(404).json({ message: 'ไม่พบชุดประเมินนี้' });
      }

      const [questions] = await db.query(
        'SELECT id, question, answer_options, order_number FROM assessment_questions WHERE set_id = ? AND active_flag = 1 ORDER BY order_number',
        [id]
      );

      res.json({ ...sets[0], questions });
    } catch (error) {
      console.error('GetSetById error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ส่งคำตอบและคำนวณผล
  submitAssessment: async (req, res) => {
    try {
      const { set_id, answers } = req.body;
      const user_id = req.user.id;

      // คำนวณคะแนนรวม
      const score = Object.values(answers).reduce((sum, val) => sum + Number(val), 0);

      // แปลผล
      const { risk_level, recommendation } = interpretResult(set_id, score);

      // บันทึกลง database
      const [result] = await db.query(
        `INSERT INTO assessment_results 
          (user_id, set_id, score, risk_level, answers, recommendation, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user_id, set_id, score, risk_level, JSON.stringify(answers), recommendation, user_id]
      );

      res.status(201).json({
        message: 'บันทึกผลการประเมินสำเร็จ',
        result: {
          id: result.insertId,
          set_id,
          score,
          risk_level,
          recommendation,
          answers
        }
      });
    } catch (error) {
      console.error('SubmitAssessment error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },

  // ดึงประวัติการประเมินของ user
  getMyResults: async (req, res) => {
    try {
      const user_id = req.user.id;
      const [results] = await db.query(
        `SELECT ar.id, ar.score, ar.risk_level, ar.recommendation, ar.taken_at,
                as2.name as set_name
         FROM assessment_results ar
         JOIN assessment_sets as2 ON ar.set_id = as2.id
         WHERE ar.user_id = ? AND ar.active_flag = 1
         ORDER BY ar.taken_at DESC`,
        [user_id]
      );
      res.json(results);
    } catch (error) {
      console.error('GetMyResults error:', error);
      res.status(500).json({ message: 'เกิดข้อผิดพลาด' });
    }
  },
};

module.exports = assessmentController;