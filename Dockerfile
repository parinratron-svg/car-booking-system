# ใช้ node version ที่เหมาะสม
FROM node:20

# กำหนด working directory ใน container
WORKDIR /app

# คัดลอก package.json เพื่อติดตั้ง dependencies
COPY package*.json ./
RUN npm install

# คัดลอกโค้ดทั้งหมดเข้าไปใน container
COPY . .

# เปิด port ที่แอปของคุณใช้งาน (ปกติคือ 3000 หรือตามที่คุณตั้งไว้ในโค้ด)
EXPOSE 3005

# คำสั่งสำหรับเริ่มรันแอป
CMD ["node", "server/index.js"]