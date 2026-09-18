export type UserRole = "superadmin" | "admin" | "user";

type Row = {
  businesses: {
    id: string;
    slug: string;
    name: string;
    created_at: string;
  };
  branches: {
    id: string;
    business_id: string;
    name: string;
    created_at: string;
  };
  profiles: {
    id: string;
    role: UserRole;
    branch_id: string | null;
    full_name: string;
    created_at: string;
  };
  products: {
    id: string;
    business_id: string;
    name: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
  };
  branch_product_prices: {
    branch_id: string;
    product_id: string;
    price: number;
    updated_at: string;
  };
  expense_categories: {
    id: string;
    business_id: string;
    name: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
  };
  sales_entries: {
    id: string;
    branch_id: string;
    product_id: string;
    entry_date: string;
    quantity: number;
    unit_price_snapshot: number;
    recorded_by: string | null;
    updated_at: string;
  };
  expense_entries: {
    id: string;
    branch_id: string;
    category_id: string;
    entry_date: string;
    amount: number;
    recorded_by: string | null;
    updated_at: string;
  };
};

type Relationships = {
  businesses: [];
  branches: [
    {
      foreignKeyName: "branches_business_id_fkey";
      columns: ["business_id"];
      isOneToOne: false;
      referencedRelation: "businesses";
      referencedColumns: ["id"];
    },
  ];
  profiles: [
    {
      foreignKeyName: "profiles_branch_id_fkey";
      columns: ["branch_id"];
      isOneToOne: false;
      referencedRelation: "branches";
      referencedColumns: ["id"];
    },
  ];
  products: [
    {
      foreignKeyName: "products_business_id_fkey";
      columns: ["business_id"];
      isOneToOne: false;
      referencedRelation: "businesses";
      referencedColumns: ["id"];
    },
  ];
  branch_product_prices: [
    {
      foreignKeyName: "branch_product_prices_branch_id_fkey";
      columns: ["branch_id"];
      isOneToOne: false;
      referencedRelation: "branches";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "branch_product_prices_product_id_fkey";
      columns: ["product_id"];
      isOneToOne: false;
      referencedRelation: "products";
      referencedColumns: ["id"];
    },
  ];
  expense_categories: [
    {
      foreignKeyName: "expense_categories_business_id_fkey";
      columns: ["business_id"];
      isOneToOne: false;
      referencedRelation: "businesses";
      referencedColumns: ["id"];
    },
  ];
  sales_entries: [];
  expense_entries: [];
};

export type Database = {
  public: {
    Tables: {
      [K in keyof Row]: {
        Row: Row[K];
        Insert: Partial<Row[K]>;
        Update: Partial<Row[K]>;
        Relationships: Relationships[K];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_role: { Args: Record<string, never>; Returns: UserRole };
      current_branch_id: { Args: Record<string, never>; Returns: string };
      current_business_id: { Args: Record<string, never>; Returns: string };
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
