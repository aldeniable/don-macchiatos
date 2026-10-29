export type UserRole = "superadmin" | "admin" | "user";

export type ShiftStatus = "open" | "pending" | "approved" | "rejected";

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
    standard_shift_hours: number;
    created_at: string;
  };
  profiles: {
    id: string;
    role: UserRole;
    branch_id: string | null;
    full_name: string;
    pay_tier_id: string | null;
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
    is_superadmin_only: boolean;
    created_at: string;
  };
  sales_entries: {
    id: string;
    branch_id: string;
    product_id: string;
    entry_date: string;
    cash_quantity: number;
    online_quantity: number;
    // Generated in Postgres as cash_quantity + online_quantity.
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
    cash_amount: number;
    online_amount: number;
    // Generated in Postgres as cash_amount + online_amount.
    amount: number;
    recorded_by: string | null;
    updated_at: string;
  };
  cash_deposits: {
    id: string;
    branch_id: string;
    deposit_date: string;
    amount: number;
    reference: string | null;
    note: string | null;
    recorded_by: string | null;
    recorded_by_name: string;
    updated_by: string | null;
    updated_by_name: string;
    created_at: string;
    updated_at: string;
  };
  stock_items: {
    id: string;
    business_id: string;
    name: string;
    is_active: boolean;
    sort_order: number;
    created_at: string;
  };
  stock_entries: {
    id: string;
    branch_id: string;
    stock_item_id: string;
    entry_date: string;
    added_quantity: number;
    used_quantity: number;
    recorded_by: string | null;
    updated_at: string;
  };
  pay_tiers: {
    id: string;
    name: string;
    daily_rate: number;
    sort_order: number;
    created_at: string;
  };
  pay_settings: {
    id: boolean;
    overtime_hourly_rate: number;
    updated_at: string;
  };
  shifts: {
    id: string;
    profile_id: string;
    branch_id: string;
    work_date: string;
    time_in: string;
    time_out: string | null;
    photo_in_path: string | null;
    photo_out_path: string | null;
    status: ShiftStatus;
    approved_in: string | null;
    approved_out: string | null;
    daily_rate_snapshot: number | null;
    overtime_rate_snapshot: number | null;
    standard_minutes_snapshot: number | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    note: string | null;
    created_at: string;
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
    {
      foreignKeyName: "profiles_pay_tier_id_fkey";
      columns: ["pay_tier_id"];
      isOneToOne: false;
      referencedRelation: "pay_tiers";
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
  cash_deposits: [];
  stock_items: [
    {
      foreignKeyName: "stock_items_business_id_fkey";
      columns: ["business_id"];
      isOneToOne: false;
      referencedRelation: "businesses";
      referencedColumns: ["id"];
    },
  ];
  stock_entries: [];
  pay_tiers: [];
  pay_settings: [];
  shifts: [
    {
      foreignKeyName: "shifts_profile_id_fkey";
      columns: ["profile_id"];
      isOneToOne: false;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    },
  ];
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
      expense_category_is_superadmin_only: {
        Args: { p_category_id: string };
        Returns: boolean;
      };
      stock_day_state: {
        Args: { p_branch_id: string; p_entry_date: string };
        Returns: {
          stock_item_id: string;
          item_name: string;
          is_active: boolean;
          sort_order: number;
          opening_quantity: number;
          added_quantity: number;
          used_quantity: number;
          closing_quantity: number;
        }[];
      };
      cash_day_state: {
        Args: { p_branch_id: string; p_start: string; p_end: string };
        Returns: {
          entry_date: string;
          cash_sales: number;
          cash_expenses: number;
          deposited: number;
          on_hand: number;
        }[];
      };
      cash_position: {
        Args: { p_through: string; p_branch_id?: string | null };
        Returns: {
          branch_id: string;
          cash_sales: number;
          cash_expenses: number;
          deposited: number;
          on_hand: number;
          last_deposit_date: string | null;
          last_deposit_amount: number | null;
        }[];
      };
      clock_in: { Args: { p_photo_path: string }; Returns: string };
      clock_out: { Args: { p_photo_path: string }; Returns: string };
    };
    Enums: {
      user_role: UserRole;
      shift_status: ShiftStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
