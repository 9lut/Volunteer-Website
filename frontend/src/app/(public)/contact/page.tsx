'use client'

import { motion } from "framer-motion"
import { Mail, Phone, MapPin, Facebook } from "lucide-react"

export default function ContactPage() {
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
            ติดต่อเรา
          </motion.h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-green-100">
            มาร่วมสร้างสังคมจิตอาสาไปด้วยกัน  
            หากมีข้อสงสัย สามารถติดต่อเราผ่านช่องทางด้านล่างได้เลย
          </p>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Email */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-white shadow-lg rounded-2xl p-8 border border-green-100 text-center hover:shadow-xl transition-all"
            >
              <Mail className="w-10 h-10 mx-auto text-green-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">อีเมล</h3>
              <p className="text-gray-600">volunteer@example.com</p>
            </motion.div>

            {/* Phone */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ once: true }}
              className="bg-white shadow-lg rounded-2xl p-8 border border-green-100 text-center hover:shadow-xl transition-all"
            >
              <Phone className="w-10 h-10 mx-auto text-green-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">โทรศัพท์</h3>
              <p className="text-gray-600">+66 80 123 4567</p>
            </motion.div>

            {/* Address */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-white shadow-lg rounded-2xl p-8 border border-green-100 text-center hover:shadow-xl transition-all"
            >
              <MapPin className="w-10 h-10 mx-auto text-green-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">ที่อยู่</h3>
              <p className="text-gray-600">
                มหาวิทยาลัย หาดใหญ่<br />จังหวัดสงขลา 10200
              </p>
            </motion.div>
          </div>

          {/* Social Links */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold text-green-700 mb-6">ติดตามเราได้ที่</h2>
            <div className="flex justify-center gap-6">
              <a
                href="#"
                className="w-12 h-12 flex items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-600 hover:text-white transition-all shadow"
              >
                <Facebook className="w-6 h-6" />
              </a>
              <a
                href="#"
                className="w-12 h-12 flex items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-600 hover:text-white transition-all shadow"
              >
                <Mail className="w-6 h-6" />
              </a>
              <a
                href="#"
                className="w-12 h-12 flex items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-600 hover:text-white transition-all shadow"
              >
                Line
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
