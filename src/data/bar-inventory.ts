export interface InventoryItem {
  id: string;
  name: string;
  displayName: string;
  category: 'spirit' | 'mixer' | 'syrup' | 'garnish';
  colorHex: string;
}

export const BAR_INVENTORY: InventoryItem[] = [
  { 
    id: 'baijiu', 
    name: '白酒', 
    displayName: 'Baijiu', 
    category: 'spirit', 
    colorHex: '#F4F4F9' // 几乎透明略带白
  },
  { 
    id: 'whisky', 
    name: '威士忌', 
    displayName: 'Whisky', 
    category: 'spirit', 
    colorHex: '#D4AF37' // 琥珀/金黄
  },
  { 
    id: 'gin', 
    name: '金酒', 
    displayName: 'Gin', 
    category: 'spirit', 
    colorHex: '#E8FFFF' // 透明略带冰蓝
  },
  { 
    id: 'lemon', 
    name: '柠檬汁', 
    displayName: 'Lemon Juice', 
    category: 'mixer', 
    colorHex: '#FFFACD' // 浑浊淡黄
  },
  { 
    id: 'soda', 
    name: '苏打水', 
    displayName: 'Soda Water', 
    category: 'mixer', 
    colorHex: '#FFFFFF' // 纯白透明
  }
];
