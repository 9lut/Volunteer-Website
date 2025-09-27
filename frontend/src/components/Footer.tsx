'use client'

import Link from "next/link"
import { Facebook, Mail, Phone, MapPin } from "lucide-react"

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-green-600 to-emerald-600 text-white relative">
      <div className="container mx-auto px-6 py-12 grid md:grid-cols-3 gap-10">
        {/* Logo + Description */}
        <div>
          <Link href="/" className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <span className="text-xl font-bold">Volunteer Web</span>
          </Link>
          <p className="text-green-100 leading-relaxed">
            ศูนย์รวมกิจกรรมและงานจิตอาสา  
            เพื่อสร้างการเปลี่ยนแปลงในมหาวิทยาลัย
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-lg font-semibold mb-4">เมนูลัด</h3>
          <ul className="space-y-2 text-green-100">
            <li>
              <Link href="/" className="hover:text-white transition-colors">
                หน้าแรก
              </Link>
            </li>
            <li>
              <Link href="/activities" className="hover:text-white transition-colors">
                กิจกรรม
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-white transition-colors">
                เกี่ยวกับเรา
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white transition-colors">
                ติดต่อเรา
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <h3 className="text-lg font-semibold mb-4">ติดต่อเรา</h3>
          <ul className="space-y-3 text-green-100">
            <li className="flex items-center space-x-3">
              <Mail className="w-5 h-5" />
              <span>volunteer@example.com</span>
            </li>
            <li className="flex items-center space-x-3">
              <Phone className="w-5 h-5" />
              <span>+66 80 123 4567</span>
            </li>
            <li className="flex items-center space-x-3">
              <MapPin className="w-5 h-5" />
              <span>มหาวิทยาลัยหาดใหญ่</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/20">
        <div className="container mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center text-sm text-green-100">
          <p>© {new Date().getFullYear()} Volunteer Web. All rights reserved.</p>
          <div className="flex space-x-4 mt-2 sm:mt-0">
            <a
              href="#"
              className="hover:text-white transition-colors"
              aria-label="Facebook"
            >
              <Facebook className="w-5 h-5" />
            </a>
            <a
              href="mailto:volunteer@example.com"
              className="hover:text-white transition-colors"
              aria-label="Email"
            >
              <Mail className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
