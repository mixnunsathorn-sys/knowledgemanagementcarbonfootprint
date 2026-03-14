-- สร้างตาราง assessments
CREATE TABLE IF NOT EXISTS assessments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  category VARCHAR(50),
  answers JSONB,
  avg_score DECIMAL(3, 2),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้าง indexes สำหรับความเร็ว
CREATE INDEX IF NOT EXISTS idx_assessments_category ON assessments(category);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at);
CREATE INDEX IF NOT EXISTS idx_assessments_email ON assessments(email);

-- สร้าง function สำหรับอัพเดต updated_at
CREATE OR REPLACE FUNCTION update_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- สร้าง trigger
DROP TRIGGER IF EXISTS update_assessments_timestamp ON assessments;
CREATE TRIGGER update_assessments_timestamp
BEFORE UPDATE ON assessments
FOR EACH ROW
EXECUTE FUNCTION update_assessments_updated_at();

-- เพิ่มข้อมูลตัวอย่าง (optional)
-- INSERT INTO assessments (name, email, phone, category, answers, avg_score, comment)
-- VALUES ('ตัวอย่าง', 'example@test.com', '0812345678', 'survey', '[5,4,3,5,4,3,5,4,3,5]', 4.1, 'ดี');