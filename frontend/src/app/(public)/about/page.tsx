'use client'

import { motion } from "framer-motion"
import { Leaf, Users, HeartHandshake } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-center">
        <div className="container mx-auto px-6">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl sm:text-5xl font-extrabold mb-6"
          >
            เกี่ยวกับเรา
          </motion.h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-green-100">
            เราคือแพลตฟอร์มที่รวมกิจกรรมและงานจิตอาสาในมหาวิทยาลัย  
            เพื่อสร้างสังคมแห่งการแบ่งปันและการมีส่วนร่วม
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-green-700 mb-4">
                พันธกิจของเรา
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                เรามุ่งมั่นที่จะเป็นศูนย์กลางของกิจกรรมอาสาสมัคร
                และการพัฒนานักศึกษาในมหาวิทยาลัย  
                โดยเปิดโอกาสให้นักศึกษา ชมรม และผู้ดูแล สามารถ
                เชื่อมโยงกันได้อย่างง่ายดาย
              </p>
              <ul className="space-y-4">
                <li className="flex items-start space-x-3">
                  <Leaf className="text-green-500 w-6 h-6" />
                  <span className="text-gray-700">
                    ส่งเสริมการเรียนรู้นอกห้องเรียน
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <Users className="text-green-500 w-6 h-6" />
                  <span className="text-gray-700">
                    สร้างเครือข่ายการมีส่วนร่วมของนักศึกษา
                  </span>
                </li>
                <li className="flex items-start space-x-3">
                  <HeartHandshake className="text-green-500 w-6 h-6" />
                  <span className="text-gray-700">
                    พัฒนาสังคมด้วยพลังจิตอาสา
                  </span>
                </li>
              </ul>
            </motion.div>

            {/* Right - Image */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="w-full h-80 bg-gradient-to-br from-green-200 to-green-100 rounded-3xl shadow-lg flex items-center justify-center">
                <span className="text-green-700 text-3xl font-bold">
                  Volunteer Web
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
