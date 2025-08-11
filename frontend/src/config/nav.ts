export type NavItem = {
      href: string;
      label: string;
      // ซ่อน/แสดงเฉพาะ desktop ถ้าต้องการ (ออปชัน)
      desktopOnly?: boolean;
    };
    
    export const NAV_MAIN: NavItem[] = [
      { href: "/activities", label: "กิจกรรมทั้งหมด" },
      { href: "/clubs", label: "ชมรม" },
    ];
    
    export const NAV_SIDE: NavItem[] = [
      { href: "/about", label: "เกี่ยวกับเรา" },
      { href: "/contact", label: "ติดต่อเรา" },
    ];
    
    // รวมไว้ใช้กับเมนูมือถือให้ครบในหนึ่งที่
    export const NAV_MOBILE: NavItem[] = [...NAV_MAIN, ...NAV_SIDE];
    