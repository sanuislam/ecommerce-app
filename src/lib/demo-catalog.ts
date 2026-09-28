/**
 * Demo catalogue for Eid Bazar: 11 categories and 48 products with real
 * (Unsplash) product photos. Loaded from Admin → Settings → "Load demo
 * products" or `npm run db:seed`. Upserts by slug, so it is safe to re-run.
 */

export type DemoVariant = { size: string; color: string; stock: number };
export type DemoProduct = {
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAt: number | null;
  stock: number;
  images: string[];
  category: string;
  featured: boolean;
  flashDealDiscount: number | null;
  variants: DemoVariant[];
};

export const DEMO_CATEGORIES: { name: string; slug: string; description: string }[] = [
  {
    "name": "Men's Panjabi & Kurta",
    "slug": "panjabi",
    "description": "Premium Eid panjabi, kurta and sherwani for men — cotton, linen and embroidered festive styles."
  },
  {
    "name": "Women's Saree",
    "slug": "saree",
    "description": "Jamdani, silk, georgette and festive sarees for Eid, weddings and every celebration."
  },
  {
    "name": "Three-piece & Salwar Kameez",
    "slug": "three-piece",
    "description": "Stitched and unstitched three-piece, salwar kameez and kurti sets for women."
  },
  {
    "name": "Abaya, Hijab & Borka",
    "slug": "abaya-hijab",
    "description": "Modest wear — abaya, borka, hijab and scarves in soft, breathable fabrics."
  },
  {
    "name": "Kids Eid Wear",
    "slug": "kids",
    "description": "Comfortable, colourful Eid outfits for boys, girls and babies."
  },
  {
    "name": "Footwear",
    "slug": "footwear",
    "description": "Nagra, jutti, loafers, sandals and sneakers for men and women."
  },
  {
    "name": "Attar & Perfume",
    "slug": "attar-perfume",
    "description": "Alcohol-free attar and long-lasting perfumes — oud, musk, rose and more."
  },
  {
    "name": "Watches & Accessories",
    "slug": "accessories",
    "description": "Watches, leather wallets, bags and sunglasses — perfect Eid gifts."
  },
  {
    "name": "Prayer Essentials",
    "slug": "prayer",
    "description": "Jaynamaz (prayer mats), tasbih, rehal and tupi for daily ibadah."
  },
  {
    "name": "Home & Decor",
    "slug": "home-decor",
    "description": "Lanterns, cushions, candles and Eid decorations to make home festive."
  },
  {
    "name": "Eid Food & Gifts",
    "slug": "food-gifts",
    "description": "Premium dates, sweets and ready-to-gift Eid hampers."
  }
];

export const DEMO_PRODUCTS: DemoProduct[] = [
  {
    "name": "Royal Blue Cotton Panjabi",
    "slug": "royal-blue-cotton-panjabi",
    "description": "Soft combed-cotton panjabi in a rich royal blue with a mandarin collar and concealed placket. Breathable for long Eid days and easy to iron.",
    "price": 2450,
    "compareAt": 2990,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1770359993283-a2c2f386584e?w=1200&q=80"
    ],
    "category": "panjabi",
    "featured": true,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "M",
        "color": "",
        "stock": 12
      },
      {
        "size": "L",
        "color": "",
        "stock": 12
      },
      {
        "size": "XL",
        "color": "",
        "stock": 12
      },
      {
        "size": "XXL",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Classic White Eid Kurta",
    "slug": "classic-white-eid-kurta",
    "description": "Timeless white kurta in lightweight cotton with subtle self-texture. Pairs with pajama or jeans — an Eid-morning essential.",
    "price": 1990,
    "compareAt": 2490,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1774527929685-0372244a6232?w=1200&q=80",
      "https://images.unsplash.com/photo-1774527929750-f2f32fbb3b93?w=1200&q=80"
    ],
    "category": "panjabi",
    "featured": true,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "M",
        "color": "",
        "stock": 12
      },
      {
        "size": "L",
        "color": "",
        "stock": 12
      },
      {
        "size": "XL",
        "color": "",
        "stock": 12
      },
      {
        "size": "XXL",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Ivory Linen Kurta Set",
    "slug": "ivory-linen-kurta-set",
    "description": "Relaxed-fit linen kurta with matching pajama. Natural slub texture, side pockets and a clean band collar.",
    "price": 3290,
    "compareAt": null,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1734418038517-ffc3a6a6751f?w=1200&q=80",
      "https://images.unsplash.com/photo-1734418040900-e964f84e8abb?w=1200&q=80"
    ],
    "category": "panjabi",
    "featured": false,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "M",
        "color": "",
        "stock": 12
      },
      {
        "size": "L",
        "color": "",
        "stock": 12
      },
      {
        "size": "XL",
        "color": "",
        "stock": 12
      },
      {
        "size": "XXL",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Cream Embroidered Sherwani",
    "slug": "cream-embroidered-sherwani",
    "description": "Festive cream sherwani with tonal thread embroidery and fabric-covered buttons. Fully lined for structure — made for Eid and weddings.",
    "price": 8990,
    "compareAt": 10990,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1783188223239-d27dbdd0b95a?w=1200&q=80"
    ],
    "category": "panjabi",
    "featured": true,
    "flashDealDiscount": 15,
    "variants": [
      {
        "size": "M",
        "color": "",
        "stock": 12
      },
      {
        "size": "L",
        "color": "",
        "stock": 12
      },
      {
        "size": "XL",
        "color": "",
        "stock": 12
      },
      {
        "size": "XXL",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "White Zari Work Sherwani",
    "slug": "white-zari-work-sherwani",
    "description": "Hand-finished zari embroidery on a white base with a structured front. A statement piece for Eid dinners and receptions.",
    "price": 9490,
    "compareAt": null,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1783188223691-8a233ee51cd8?w=1200&q=80"
    ],
    "category": "panjabi",
    "featured": false,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "M",
        "color": "",
        "stock": 12
      },
      {
        "size": "L",
        "color": "",
        "stock": 12
      },
      {
        "size": "XL",
        "color": "",
        "stock": 12
      },
      {
        "size": "XXL",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Groom's Embroidered Sherwani",
    "slug": "groom-s-embroidered-sherwani",
    "description": "Rich embroidered sherwani with detailed neckline work, ideal for weddings and special Eid gatherings.",
    "price": 11990,
    "compareAt": 13990,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1760080838961-4208536db385?w=1200&q=80"
    ],
    "category": "panjabi",
    "featured": false,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "M",
        "color": "",
        "stock": 12
      },
      {
        "size": "L",
        "color": "",
        "stock": 12
      },
      {
        "size": "XL",
        "color": "",
        "stock": 12
      },
      {
        "size": "XXL",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Emerald Silk Saree",
    "slug": "emerald-silk-saree",
    "description": "Luxurious emerald silk saree with a contrast golden border and unstitched blouse piece. Soft drape with a subtle sheen.",
    "price": 6490,
    "compareAt": 7490,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1679006831648-7c9ea12e5807?w=1200&q=80"
    ],
    "category": "saree",
    "featured": true,
    "flashDealDiscount": null,
    "variants": []
  },
  {
    "name": "Pink & Orange Festive Saree",
    "slug": "pink-orange-festive-saree",
    "description": "Vibrant pink and orange saree with woven gold motifs — a cheerful choice for Eid visits.",
    "price": 4290,
    "compareAt": null,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=1200&q=80"
    ],
    "category": "saree",
    "featured": false,
    "flashDealDiscount": 10,
    "variants": []
  },
  {
    "name": "Purple Katan Saree",
    "slug": "purple-katan-saree",
    "description": "Purple katan saree with a gold zari border and pallu. Comes with a matching blouse piece.",
    "price": 5590,
    "compareAt": 6290,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1641699862936-be9f49b1c38d?w=1200&q=80"
    ],
    "category": "saree",
    "featured": false,
    "flashDealDiscount": null,
    "variants": []
  },
  {
    "name": "Maroon Jamdani Saree",
    "slug": "maroon-jamdani-saree",
    "description": "Handwoven-style jamdani in deep maroon with classic geometric motifs — a Bangladeshi heritage favourite.",
    "price": 7990,
    "compareAt": 8990,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1200&q=80",
      "https://images.unsplash.com/photo-1610030469839-f909584b43f1?w=1200&q=80"
    ],
    "category": "saree",
    "featured": true,
    "flashDealDiscount": null,
    "variants": []
  },
  {
    "name": "Blue & Yellow Cotton Saree",
    "slug": "blue-yellow-cotton-saree",
    "description": "Breezy cotton saree in blue with a sunny yellow border. Comfortable for everyday wear and family gatherings.",
    "price": 2890,
    "compareAt": null,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1610189012906-4c0aa9b9781e?w=1200&q=80"
    ],
    "category": "saree",
    "featured": false,
    "flashDealDiscount": null,
    "variants": []
  },
  {
    "name": "White Floral Three-piece",
    "slug": "white-floral-three-piece",
    "description": "Printed cotton three-piece: kameez, salwar and matching dupatta with delicate floral prints.",
    "price": 3490,
    "compareAt": 3990,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1745313452052-0e4e341f326c?w=1200&q=80"
    ],
    "category": "three-piece",
    "featured": true,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "S",
        "color": "",
        "stock": 12
      },
      {
        "size": "M",
        "color": "",
        "stock": 12
      },
      {
        "size": "L",
        "color": "",
        "stock": 12
      },
      {
        "size": "XL",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Pink Floral Kurti Set",
    "slug": "pink-floral-kurti-set",
    "description": "Two-piece kurti set in soft pink with floral print, straight pants and side slits for easy movement.",
    "price": 2790,
    "compareAt": null,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1741847639057-b51a25d42892?w=1200&q=80"
    ],
    "category": "three-piece",
    "featured": false,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "S",
        "color": "",
        "stock": 12
      },
      {
        "size": "M",
        "color": "",
        "stock": 12
      },
      {
        "size": "L",
        "color": "",
        "stock": 12
      },
      {
        "size": "XL",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Yellow Tiered Embroidered Kurti",
    "slug": "yellow-tiered-embroidered-kurti",
    "description": "Flowy tiered kurti in mustard yellow with an embroidered neckline — bright, festive and comfortable.",
    "price": 2190,
    "compareAt": 2590,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1760287363878-1a09af715b80?w=1200&q=80"
    ],
    "category": "three-piece",
    "featured": false,
    "flashDealDiscount": 20,
    "variants": [
      {
        "size": "S",
        "color": "",
        "stock": 12
      },
      {
        "size": "M",
        "color": "",
        "stock": 12
      },
      {
        "size": "L",
        "color": "",
        "stock": 12
      },
      {
        "size": "XL",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Navy Paisley Kurti",
    "slug": "navy-paisley-kurti",
    "description": "Navy kurti with an all-over paisley print, three-quarter sleeves and a relaxed A-line cut.",
    "price": 1890,
    "compareAt": null,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1760287364219-160c234ded00?w=1200&q=80"
    ],
    "category": "three-piece",
    "featured": false,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "S",
        "color": "",
        "stock": 12
      },
      {
        "size": "M",
        "color": "",
        "stock": 12
      },
      {
        "size": "L",
        "color": "",
        "stock": 12
      },
      {
        "size": "XL",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Purple Printed Salwar Kameez",
    "slug": "purple-printed-salwar-kameez",
    "description": "Purple printed tunic with striped straight pants and a chiffon dupatta. Stitched and ready to wear.",
    "price": 3190,
    "compareAt": 3690,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1760287363699-a08d553fb8a9?w=1200&q=80"
    ],
    "category": "three-piece",
    "featured": false,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "S",
        "color": "",
        "stock": 12
      },
      {
        "size": "M",
        "color": "",
        "stock": 12
      },
      {
        "size": "L",
        "color": "",
        "stock": 12
      },
      {
        "size": "XL",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Pearl Embellished Black Abaya",
    "slug": "pearl-embellished-black-abaya",
    "description": "Flowing black abaya with floral appliqué and pearl detailing on the sleeves. Premium nida fabric.",
    "price": 4590,
    "compareAt": 5290,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1772474500365-c2c520545f44?w=1200&q=80",
      "https://images.unsplash.com/photo-1772474578035-bebcd90b355d?w=1200&q=80"
    ],
    "category": "abaya-hijab",
    "featured": true,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "52",
        "color": "",
        "stock": 12
      },
      {
        "size": "54",
        "color": "",
        "stock": 12
      },
      {
        "size": "56",
        "color": "",
        "stock": 12
      },
      {
        "size": "58",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Beige Embroidered Abaya",
    "slug": "beige-embroidered-abaya",
    "description": "Elegant beige abaya with intricate tone-on-tone embroidery and a front open style.",
    "price": 3990,
    "compareAt": null,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1760083545495-b297b1690672?w=1200&q=80"
    ],
    "category": "abaya-hijab",
    "featured": false,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "52",
        "color": "",
        "stock": 12
      },
      {
        "size": "54",
        "color": "",
        "stock": 12
      },
      {
        "size": "56",
        "color": "",
        "stock": 12
      },
      {
        "size": "58",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Navy Open-front Abaya",
    "slug": "navy-open-front-abaya",
    "description": "Navy open-front abaya in soft crepe — layer it over any outfit for a modest, polished look.",
    "price": 3490,
    "compareAt": 3990,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1762605135326-5c4bcc5ef006?w=1200&q=80"
    ],
    "category": "abaya-hijab",
    "featured": false,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "52",
        "color": "",
        "stock": 12
      },
      {
        "size": "54",
        "color": "",
        "stock": 12
      },
      {
        "size": "56",
        "color": "",
        "stock": 12
      },
      {
        "size": "58",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Soft Jersey Hijab",
    "slug": "soft-jersey-hijab",
    "description": "Stretchy premium jersey hijab that stays in place without pins. Breathable and non-slip.",
    "price": 590,
    "compareAt": 790,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1542380841-5eef57349ca1?w=1200&q=80"
    ],
    "category": "abaya-hijab",
    "featured": false,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "",
        "color": "Blue",
        "stock": 15
      },
      {
        "size": "",
        "color": "Black",
        "stock": 15
      },
      {
        "size": "",
        "color": "Beige",
        "stock": 15
      }
    ]
  },
  {
    "name": "Girls' Red & Gold Lehenga",
    "slug": "girls-red-gold-lehenga",
    "description": "Twirl-ready red lehenga with golden embroidery, matching top and dupatta for little ones.",
    "price": 2990,
    "compareAt": 3490,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1639563853019-779fb4e41844?w=1200&q=80"
    ],
    "category": "kids",
    "featured": true,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "2-3Y",
        "color": "",
        "stock": 12
      },
      {
        "size": "4-5Y",
        "color": "",
        "stock": 12
      },
      {
        "size": "6-7Y",
        "color": "",
        "stock": 12
      },
      {
        "size": "8-9Y",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Girls' Yellow Festive Frock",
    "slug": "girls-yellow-festive-frock",
    "description": "Bright yellow and red festive frock with a soft cotton lining — comfortable enough for a full Eid day.",
    "price": 2290,
    "compareAt": null,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1597294150753-b6e790b68d1c?w=1200&q=80",
      "https://images.unsplash.com/photo-1597294150808-a1211d9f6604?w=1200&q=80"
    ],
    "category": "kids",
    "featured": false,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "2-3Y",
        "color": "",
        "stock": 12
      },
      {
        "size": "4-5Y",
        "color": "",
        "stock": 12
      },
      {
        "size": "6-7Y",
        "color": "",
        "stock": 12
      },
      {
        "size": "8-9Y",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Baby Fez Cap & Kurta Set",
    "slug": "baby-fez-cap-kurta-set",
    "description": "Adorable baby kurta set with a matching red fez cap — perfect for baby's first Eid photos.",
    "price": 1490,
    "compareAt": 1790,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1765146030541-daeb7dd1861c?w=1200&q=80"
    ],
    "category": "kids",
    "featured": false,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "6-12M",
        "color": "",
        "stock": 12
      },
      {
        "size": "12-18M",
        "color": "",
        "stock": 12
      },
      {
        "size": "18-24M",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Boys' White Cotton Shirt",
    "slug": "boys-white-cotton-shirt",
    "description": "Crisp white cotton shirt for boys — pairs with panjabi pajama or trousers for Eid prayers.",
    "price": 1190,
    "compareAt": null,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1707745735759-faa78753efb2?w=1200&q=80"
    ],
    "category": "kids",
    "featured": false,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "2-3Y",
        "color": "",
        "stock": 12
      },
      {
        "size": "4-5Y",
        "color": "",
        "stock": 12
      },
      {
        "size": "6-7Y",
        "color": "",
        "stock": 12
      },
      {
        "size": "8-9Y",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Red Embroidered Jutti",
    "slug": "red-embroidered-jutti",
    "description": "Handcrafted red jutti with gold embroidery and a cushioned insole. Perfect with sarees and lehengas.",
    "price": 1890,
    "compareAt": 2290,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1777980653176-849502631cf6?w=1200&q=80",
      "https://images.unsplash.com/photo-1777980652272-d5a1930da4f3?w=1200&q=80"
    ],
    "category": "footwear",
    "featured": true,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "36",
        "color": "",
        "stock": 12
      },
      {
        "size": "37",
        "color": "",
        "stock": 12
      },
      {
        "size": "38",
        "color": "",
        "stock": 12
      },
      {
        "size": "39",
        "color": "",
        "stock": 12
      },
      {
        "size": "40",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Teal Flat Jutti",
    "slug": "teal-flat-jutti",
    "description": "Teal embroidered flat jutti with soft leather lining — comfortable festive footwear.",
    "price": 1590,
    "compareAt": null,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1777980808039-c8be538797f0?w=1200&q=80"
    ],
    "category": "footwear",
    "featured": false,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "36",
        "color": "",
        "stock": 12
      },
      {
        "size": "37",
        "color": "",
        "stock": 12
      },
      {
        "size": "38",
        "color": "",
        "stock": 12
      },
      {
        "size": "39",
        "color": "",
        "stock": 12
      },
      {
        "size": "40",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Brown Leather Loafers",
    "slug": "brown-leather-loafers",
    "description": "Genuine leather slip-on loafers in chestnut brown with a flexible rubber sole. Goes with panjabi and formal wear.",
    "price": 3490,
    "compareAt": 3990,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1616406432452-07bc5938759d?w=1200&q=80",
      "https://images.unsplash.com/photo-1576792741377-eb0f4f6d1a47?w=1200&q=80"
    ],
    "category": "footwear",
    "featured": true,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "40",
        "color": "",
        "stock": 12
      },
      {
        "size": "41",
        "color": "",
        "stock": 12
      },
      {
        "size": "42",
        "color": "",
        "stock": 12
      },
      {
        "size": "43",
        "color": "",
        "stock": 12
      },
      {
        "size": "44",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Men's Leather Sandals",
    "slug": "men-s-leather-sandals",
    "description": "Two-strap leather sandals with a cushioned footbed — the classic Eid chappal.",
    "price": 1990,
    "compareAt": null,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1585120824848-8a5cd41493d2?w=1200&q=80"
    ],
    "category": "footwear",
    "featured": false,
    "flashDealDiscount": 15,
    "variants": [
      {
        "size": "40",
        "color": "Black",
        "stock": 8
      },
      {
        "size": "40",
        "color": "Brown",
        "stock": 8
      },
      {
        "size": "41",
        "color": "Black",
        "stock": 8
      },
      {
        "size": "41",
        "color": "Brown",
        "stock": 8
      },
      {
        "size": "42",
        "color": "Black",
        "stock": 8
      },
      {
        "size": "42",
        "color": "Brown",
        "stock": 8
      },
      {
        "size": "43",
        "color": "Black",
        "stock": 8
      },
      {
        "size": "43",
        "color": "Brown",
        "stock": 8
      },
      {
        "size": "44",
        "color": "Black",
        "stock": 8
      },
      {
        "size": "44",
        "color": "Brown",
        "stock": 8
      }
    ]
  },
  {
    "name": "Classic White Sneakers",
    "slug": "classic-white-sneakers",
    "description": "Minimal white sneakers with a padded collar and grippy sole — everyday comfort.",
    "price": 2790,
    "compareAt": 3290,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1608229751021-ed4bd8677753?w=1200&q=80"
    ],
    "category": "footwear",
    "featured": false,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "40",
        "color": "",
        "stock": 12
      },
      {
        "size": "41",
        "color": "",
        "stock": 12
      },
      {
        "size": "42",
        "color": "",
        "stock": 12
      },
      {
        "size": "43",
        "color": "",
        "stock": 12
      },
      {
        "size": "44",
        "color": "",
        "stock": 12
      }
    ]
  },
  {
    "name": "Crystal Oud Perfume 100ml",
    "slug": "crystal-oud-perfume-100ml",
    "description": "Warm oud and amber perfume in a crystal-cut bottle. Long-lasting eau de parfum.",
    "price": 2490,
    "compareAt": 2990,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1612784642053-15614e602ed7?w=1200&q=80"
    ],
    "category": "attar-perfume",
    "featured": true,
    "flashDealDiscount": null,
    "variants": []
  },
  {
    "name": "White Musk Attar 12ml",
    "slug": "white-musk-attar-12ml",
    "description": "Alcohol-free white musk attar — clean, soft and long-lasting. Roll-on bottle.",
    "price": 690,
    "compareAt": null,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1646149757906-e6e9e9a7c77f?w=1200&q=80"
    ],
    "category": "attar-perfume",
    "featured": false,
    "flashDealDiscount": null,
    "variants": []
  },
  {
    "name": "Black Oud Royale 50ml",
    "slug": "black-oud-royale-50ml",
    "description": "Deep, smoky oud blended with saffron and rose. Elegant black and gold bottle — a premium Eid gift.",
    "price": 3290,
    "compareAt": 3790,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200&q=80",
      "https://images.unsplash.com/photo-1585218334450-afcf929da36e?w=1200&q=80"
    ],
    "category": "attar-perfume",
    "featured": true,
    "flashDealDiscount": 10,
    "variants": []
  },
  {
    "name": "Golden Rose Attar 6ml",
    "slug": "golden-rose-attar-6ml",
    "description": "Concentrated rose attar in a golden bottle. Alcohol-free and suitable before prayers.",
    "price": 490,
    "compareAt": 590,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=1200&q=80"
    ],
    "category": "attar-perfume",
    "featured": false,
    "flashDealDiscount": null,
    "variants": []
  },
  {
    "name": "Chronograph Leather Watch",
    "slug": "chronograph-leather-watch",
    "description": "Stainless steel chronograph with a genuine brown leather strap. Water resistant to 30m.",
    "price": 4990,
    "compareAt": 5990,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=1200&q=80"
    ],
    "category": "accessories",
    "featured": true,
    "flashDealDiscount": null,
    "variants": []
  },
  {
    "name": "Silver Link Analog Watch",
    "slug": "silver-link-analog-watch",
    "description": "Classic silver analog watch with a stainless link bracelet and date window.",
    "price": 3790,
    "compareAt": null,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=1200&q=80"
    ],
    "category": "accessories",
    "featured": false,
    "flashDealDiscount": null,
    "variants": []
  },
  {
    "name": "Genuine Leather Bifold Wallet",
    "slug": "genuine-leather-bifold-wallet",
    "description": "Slim bifold wallet in full-grain leather with 6 card slots and a note section.",
    "price": 1290,
    "compareAt": 1590,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1624538000860-24716b9050f2?w=1200&q=80",
      "https://images.unsplash.com/photo-1531190260877-c8d11eb5afaf?w=1200&q=80"
    ],
    "category": "accessories",
    "featured": false,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "",
        "color": "Brown",
        "stock": 15
      },
      {
        "size": "",
        "color": "Black",
        "stock": 15
      }
    ]
  },
  {
    "name": "Gold Frame Sunglasses",
    "slug": "gold-frame-sunglasses",
    "description": "Aviator-style sunglasses with a gold metal frame and UV400 lenses.",
    "price": 1590,
    "compareAt": null,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=1200&q=80"
    ],
    "category": "accessories",
    "featured": false,
    "flashDealDiscount": null,
    "variants": []
  },
  {
    "name": "Brown Leather Handbag",
    "slug": "brown-leather-handbag",
    "description": "Structured brown handbag with top handles, a detachable strap and zip closure.",
    "price": 3990,
    "compareAt": 4690,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?w=1200&q=80"
    ],
    "category": "accessories",
    "featured": false,
    "flashDealDiscount": null,
    "variants": []
  },
  {
    "name": "Velvet Prayer Mat (Jaynamaz)",
    "slug": "velvet-prayer-mat-jaynamaz",
    "description": "Soft velvet jaynamaz with a padded base and non-slip back. Classic mihrab design.",
    "price": 1290,
    "compareAt": 1490,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1600814832809-579119f47045?w=1200&q=80",
      "https://images.unsplash.com/photo-1761958150507-7bcc80840cf9?w=1200&q=80"
    ],
    "category": "prayer",
    "featured": true,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "",
        "color": "Green",
        "stock": 15
      },
      {
        "size": "",
        "color": "Maroon",
        "stock": 15
      },
      {
        "size": "",
        "color": "Blue",
        "stock": 15
      }
    ]
  },
  {
    "name": "Wooden Tasbih 99 Beads",
    "slug": "wooden-tasbih-99-beads",
    "description": "Smooth wooden tasbih with 99 beads and a tassel — lightweight and durable.",
    "price": 390,
    "compareAt": null,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1778616364918-34490657598f?w=1200&q=80"
    ],
    "category": "prayer",
    "featured": false,
    "flashDealDiscount": null,
    "variants": []
  },
  {
    "name": "Carved Wooden Rehal (Quran Stand)",
    "slug": "carved-wooden-rehal-quran-stand",
    "description": "Hand-carved foldable wooden rehal to hold the Quran comfortably while reading.",
    "price": 890,
    "compareAt": 1090,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1775143612377-335468fbb565?w=1200&q=80",
      "https://images.unsplash.com/photo-1773738495671-79b90e39dc54?w=1200&q=80"
    ],
    "category": "prayer",
    "featured": false,
    "flashDealDiscount": null,
    "variants": []
  },
  {
    "name": "Embroidered Tupi (Prayer Cap)",
    "slug": "embroidered-tupi-prayer-cap",
    "description": "Breathable embroidered tupi in soft cotton — comfortable for daily namaz.",
    "price": 290,
    "compareAt": null,
    "stock": 0,
    "images": [
      "https://images.unsplash.com/photo-1782237319321-bac65528d4a5?w=1200&q=80"
    ],
    "category": "prayer",
    "featured": false,
    "flashDealDiscount": null,
    "variants": [
      {
        "size": "",
        "color": "White",
        "stock": 15
      },
      {
        "size": "",
        "color": "Black",
        "stock": 15
      }
    ]
  },
  {
    "name": "Moroccan Lantern Light",
    "slug": "moroccan-lantern-light",
    "description": "Metal Moroccan-style lantern with cut-work patterns that cast beautiful shadows. Battery LED included.",
    "price": 1490,
    "compareAt": 1790,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1639918063455-65e676f2ca60?w=1200&q=80",
      "https://images.unsplash.com/photo-1649200893528-972b2b6b942b?w=1200&q=80"
    ],
    "category": "home-decor",
    "featured": true,
    "flashDealDiscount": null,
    "variants": []
  },
  {
    "name": "Cotton Cushion Cover (Set of 2)",
    "slug": "cotton-cushion-cover-set-of-2",
    "description": "Soft cotton cushion covers with hidden zip — refresh your living room for Eid. 16×16 in.",
    "price": 790,
    "compareAt": null,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1629949009765-40fc74c9ec21?w=1200&q=80"
    ],
    "category": "home-decor",
    "featured": false,
    "flashDealDiscount": null,
    "variants": []
  },
  {
    "name": "Scented Pillar Candles (Set of 3)",
    "slug": "scented-pillar-candles-set-of-3",
    "description": "Hand-poured pillar candles with a gentle vanilla scent. Burn time up to 30 hours each.",
    "price": 690,
    "compareAt": 890,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1601479604588-68d9e6d386b5?w=1200&q=80"
    ],
    "category": "home-decor",
    "featured": false,
    "flashDealDiscount": null,
    "variants": []
  },
  {
    "name": "Crescent Moon Decor Set",
    "slug": "crescent-moon-decor-set",
    "description": "Wooden crescent moon decorations for tables and shelves — easy Eid styling.",
    "price": 990,
    "compareAt": null,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1780744973119-efad58730706?w=1200&q=80"
    ],
    "category": "home-decor",
    "featured": false,
    "flashDealDiscount": null,
    "variants": []
  },
  {
    "name": "Premium Ajwa Dates 500g",
    "slug": "premium-ajwa-dates-500g",
    "description": "Soft, rich Ajwa dates — perfect for iftar, Eid guests and gifting.",
    "price": 1290,
    "compareAt": 1490,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1710228010206-934856204165?w=1200&q=80",
      "https://images.unsplash.com/photo-1777891258071-45b4cee69360?w=1200&q=80"
    ],
    "category": "food-gifts",
    "featured": true,
    "flashDealDiscount": null,
    "variants": []
  },
  {
    "name": "Eid Sweets Gift Box",
    "slug": "eid-sweets-gift-box",
    "description": "Assorted sweets packed in a festive gift box — ready to send to family and friends.",
    "price": 1590,
    "compareAt": null,
    "stock": 40,
    "images": [
      "https://images.unsplash.com/photo-1757179891229-5c2c63076fbb?w=1200&q=80",
      "https://images.unsplash.com/photo-1758910536889-43ce7b3199fd?w=1200&q=80"
    ],
    "category": "food-gifts",
    "featured": false,
    "flashDealDiscount": null,
    "variants": []
  }
];
