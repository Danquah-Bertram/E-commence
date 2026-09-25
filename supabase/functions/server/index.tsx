
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import * as bcrypt from "npm:bcryptjs";

const app = new Hono().basePath('/make-server-627aa94e');

app.use("*", logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "X-User-Id"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  maxAge: 600,
}));

// ── helpers ────────────────────────────────────────────────────────────────

function uid() { return crypto.randomUUID(); }
function now() { return new Date().toISOString(); }
const SESSION_TTL = 5 * 60 * 1000;

async function createSession(userId: string): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await kv.set(`session:${token}`, {
    userId,
    expiresAt: Date.now() + SESSION_TTL,
  });

  return token;
}

async function getSessionUser(c: any) {
  const auth = c.req.header("Authorization") || "";

  if (!auth.startsWith("Bearer ")) return null;

  const token = auth.slice(7).trim();
  if (!token || token === Deno.env.get("SUPABASE_ANON_KEY")) return null;

  const session = await kv.get(`session:${token}`);

  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    await kv.del(`session:${token}`);
    return null;
  }

  const user = await kv.get(`user:${session.userId}`);

  if (!user) {
    await kv.del(`session:${token}`);
    return null;
  }

  // Sliding inactivity timeout
  session.expiresAt = Date.now() + SESSION_TTL;
  await kv.set(`session:${token}`, session);

  return user;
}
async function getAdmin(c: any) {
  const u = await getSessionUser(c);
  return u?.role === "admin" ? u : null;
}

async function getSuperAdmin(c: any) {
  const u = await getAdmin(c);
  return u?.accessLevel === "super" ? u : null;
}

async function getUser(c: any) {
  return await getSessionUser(c);
}

async function logActivity(type: string, description: string, userName?: string) {
  const logs: any[] = (await kv.get("activity_logs")) ?? [];
  logs.unshift({ id: uid(), type, description, userName, createdAt: now() });
  await kv.set("activity_logs", logs.slice(0, 500));
}
async function logAdminActivity(
  type: string,
  description: string,
  userName?: string,
  admin?: any
) {
  const logs: any[] = (await kv.get("admin_activity_logs")) ?? [];

  logs.unshift({
    id: uid(),

    // WHO performed the action
    adminId: admin?.id ?? null,
    adminName: admin?.name ?? userName ?? "Admin",
    adminEmail: admin?.email ?? null,

    // WHAT they did
    action: type,
    detail: description,

    createdAt: now(),
  });

  await kv.set("admin_activity_logs", logs.slice(0, 500));
}async function moveToTrash(
  type: string,
  originalKey: string,
  originalData: any,
  deletedBy: any
) {
  const trashId = uid();

  const trashItem = {
    id: trashId,
    type,
    originalKey,
    originalId: originalData?.id ?? null,
    data: originalData,
    deletedById: deletedBy?.id ?? null,
    deletedByName: deletedBy?.name ?? "Unknown",
    deletedAt: now(),
  };

  await kv.set(`trash:${trashId}`, trashItem);

  return trashItem;
}
const DEFAULT_CATEGORIES = ["chargers", "earphones", "power-banks", "phone-cases", "cables", "screen-protectors", "other"];

const DEFAULT_SETTINGS = {
  superAdminApprovalRequired: false,
  // ── Business Info ─────────────────────────────────────────────
  name: "Prayer Is The Key Ventures",
  email: "danquahbertram26@gmail.com",
  phone: "0596215537",
  tagline:
    "Your trusted source for quality products. Fast delivery, genuine products.",

  // ── Opening Hours ─────────────────────────────────────────────
  monFriHours: "8:00 AM – 6:00 PM",
  satHours: "9:00 AM – 4:00 PM",
  sunHours: "Closed",

  // ── Branding ──────────────────────────────────────────────────
  // These will be populated automatically when images are uploaded.
  logoUrl: "",
  footerLogoUrl: "",

  // ── Homepage Content ──────────────────────────────────────────
  homepageTitle: "Welcome to Prayer Is The Key Ventures",

  homepageSubtitle:
    "Quality phone accessories delivered to your door.",

  homepageButtonText: "Shop Now",

  homepageAboutTitle: "About Us",

  homepageAboutText:
    "Your trusted source for quality phone accessories.",

  // ── Shop by Category ──────────────────────────────────────────
  homepageCategories: [
    {
      name: "Chargers & Cables",
      count: "15+",
      emoji: "⚡",
      nameColor: "#172554",
      countColor: "#6B7280",
    },
    {
      name: "Wireless Earphones",
      count: "20+",
      emoji: "🎧",
      nameColor: "#172554",
      countColor: "#6B7280",
    },
    {
      name: "Power Banks",
      count: "12+",
      emoji: "🔋",
      nameColor: "#172554",
      countColor: "#6B7280",
    },
  ],

  // ── Homepage Features ─────────────────────────────────────────
  homepageFeatures: [
    {
      title: "Wide Selection",
      description:
        "Browse our extensive collection of phone accessories — from chargers to cases.",
      titleColor: "#172554",
      descriptionColor: "#4B5563",
    },
    {
      title: "Secure Payments",
      description:
        "Safe online payments powered by Paystack — Cards & Mobile Money accepted.",
      titleColor: "#172554",
      descriptionColor: "#4B5563",
    },
    {
      title: "Fast Delivery",
      description:
        "Quick and reliable delivery to your doorstep across Ghana.",
      titleColor: "#172554",
      descriptionColor: "#4B5563",
    },
    {
      title: "Easy Checkout",
      description:
        "Simple, hassle-free checkout with instant order confirmation.",
      titleColor: "#172554",
      descriptionColor: "#4B5563",
    },
  ],

  // ── Footer Content ────────────────────────────────────────────
  footerCopyright:
    "© 2026 Prayer Is The Key Ventures. All rights reserved.",

  footerDescription:
    "Quality phone accessories delivered to your door.",
};
// ── health ─────────────────────────────────────────────────────────────────

app.get("/health", (c) => c.json({ status: "ok" }));

// ── seed ───────────────────────────────────────────────────────────────────
// Seeds/updates both admin accounts, default categories, default settings.
// Safe to call multiple times (idempotent per field).

app.post("/seed", async (c) => {
  try {
   const ADMINS = [
  {
    email: "danquahroger94@gmail.com",
    name: "Admin",
    accessLevel: "full",
  },
  {
    email: "danquahbertram26@gmail.com",
    name: "Bertram",
    accessLevel: "super",
  },
];

for (const a of ADMINS) {
  const email = a.email.toLowerCase();
  const existingId: string | null = await kv.get(`user_email:${email}`);

  if (existingId) {
    const existing = await kv.get(`user:${existingId}`);

    if (existing) {
      // Keep the existing password.
      // Seed only makes sure these accounts remain administrators
      // with their correct access level.
      existing.email = email;
      existing.name = a.name;
      existing.role = "admin";
      existing.accessLevel = a.accessLevel;

      if (!existing.permissions) {
        existing.permissions = {};
      }

      if (typeof existing.suspended !== "boolean") {
        existing.suspended = false;
      }

      await kv.set(`user:${existingId}`, existing);
    }
  } else {
    // Do not create a new seeded account without a password.
    // Existing accounts are preserved; new admin accounts should
    // be created through the Super Admin panel.
  }
}

    // Seed default categories if none exist
    const existingCats = await kv.get("categories");
    if (!existingCats) {
      await kv.set("categories", DEFAULT_CATEGORIES);
    }

    // Seed default business settings if none exist
   const existingSettings = await kv.get("business_settings");

if (!existingSettings) {
  await kv.set("business_settings", DEFAULT_SETTINGS);
} else {
  const mergedSettings = {
    ...DEFAULT_SETTINGS,
    ...existingSettings,
  };

  await kv.set("business_settings", mergedSettings);
}
    return c.json({ seeded: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ── auth ───────────────────────────────────────────────────────────────────

app.post("/auth/register", async (c) => {
  try {
    const { email, password, name, phone } = await c.req.json();
    if (!email || !password || !name) return c.json({ error: "All fields required" }, 400);
    if (password.length < 6) return c.json({ error: "Password must be at least 6 characters" }, 400);
    const existingId = await kv.get(`user_email:${email.toLowerCase()}`);
    if (existingId) return c.json({ error: "Email already registered" }, 400);
   const passwordHash = bcrypt.hashSync(password, 10);
    const userId = uid();
    const user = { id: userId, email: email.toLowerCase(), name, phone: phone || null, role: "customer", passwordHash, suspended: false, createdAt: now() };
    await kv.set(`user:${userId}`, user);
    await kv.set(`user_email:${email.toLowerCase()}`, userId);
    await logActivity("user", `New customer registered: ${name} (${email})`, name);
    const { passwordHash: _, ...safe } = user;
    return c.json({ user: safe }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});
app.post("/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json(
        { error: "Email and password required" },
        400
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const userId = await kv.get(`user_email:${normalizedEmail}`);

    if (!userId) {
      return c.json(
        { error: "Invalid email or password" },
        401
      );
    }

    const user = await kv.get(`user:${userId}`);

    if (!user) {
      return c.json(
        { error: "Invalid email or password" },
        401
      );
    }

    const valid = bcrypt.compareSync(
      password,
      user.passwordHash
    );

    if (!valid) {
      return c.json(
        { error: "Invalid email or password" },
        401
      );
    }

    if (user.suspended) {
      return c.json(
        {
          error:
            "Your account has been suspended. Contact danquahbertram26@gmail.com or call 0596215537.",
        },
        403
      );
    }

    // Create a secure server-side session.
    const tokenBytes = crypto.getRandomValues(
      new Uint8Array(32)
    );

    const token = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const session = {
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL,
    };

    await kv.set(`session:${token}`, session);

    await logActivity(
      "login",
      `${user.role === "admin" ? "Admin" : "Customer"} logged in: ${normalizedEmail}`,
      user.name
    );

    const { passwordHash: _, ...safe } = user;

    return c.json({
      token,
      user: safe,
    });
  } catch (e: any) {
    console.error("Login error:", e);

    return c.json(
      { error: e.message || "Login failed" },
      500
    );
  }
});

app.get("/auth/me", async (c) => {
  try {
    const user = await getUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { passwordHash: _, ...safe } = user;
    return c.json({ user: safe });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});
app.put("/auth/profile", async (c) => {
  try {
    const user = await getUser(c);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const {
      name,
      currentPassword,
      newPassword,
      phone,
    } = await c.req.json();

    if (name !== undefined) {
      user.name = String(name).trim();
    }

    if (phone !== undefined) {
      user.phone = phone ? String(phone).trim() : null;
    }

    // Password change requires BOTH passwords.
    if (newPassword !== undefined) {
      if (!currentPassword) {
        return c.json(
          { error: "Current password is required to change your password" },
          400
        );
      }

      if (newPassword.length < 8) {
        return c.json(
          { error: "Password must be at least 8 characters long" },
          400
        );
      }

      const valid = bcrypt.compareSync(
        currentPassword,
        user.passwordHash ?? ""
      );

      if (!valid) {
        return c.json(
          { error: "Current password is incorrect" },
          400
        );
      }

      user.passwordHash = bcrypt.hashSync(newPassword, 10);
    }

    await kv.set(`user:${user.id}`, user);

    const { passwordHash: _, ...safe } = user;

    return c.json({ user: safe });
  } catch (e: any) {
    console.error("Profile update error:", e);

    return c.json(
      { error: e.message || "Failed to update profile" },
      500
    );
  }
});

app.post("/auth/forgot-password", async (c) => {
  try {
    const { email } = await c.req.json();
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail) {
      return c.json({ error: "Email is required" }, 400);
    }

    // Look up the account by email
    const userId = await kv.get(`user_email:${normalizedEmail}`);

   // Don't reveal whether an account exists
if (!userId) {
  return c.json({
    sent: true,
    message: "If an account exists for this email, a password reset link has been sent."
  });
}
   // Make sure the actual user account still exists
const user = await kv.get(`user:${userId}`);

if (!user) {
  // Remove stale email mapping if the account no longer exists
  await kv.del(`user_email:${normalizedEmail}`);

  return c.json({
    sent: true,
    message: "If an account exists for this email, a password reset link has been sent."
  });
}
   // Suspended/revoked accounts cannot reset their password
if (user.suspended === true) {
  return c.json({
    sent: true,
    message: "If an account exists for this email, a password reset link has been sent."
  });
}
    // Generate secure reset token
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const token = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Token expires in 5 minutes
    await kv.set(`reset_token:${token}`, {
      userId,
   expiresAt: Date.now() + 5 * 60 * 1000
    });

    const resetUrl =
      `https://dude-drive-69685359.figma.site/reset-password?token=${encodeURIComponent(token)}`;

    const gmailScriptUrl = Deno.env.get("GMAIL_SCRIPT_URL");
    const gmailScriptSecret = Deno.env.get("GMAIL_SCRIPT_SECRET");

    if (!gmailScriptUrl || !gmailScriptSecret) {
      await kv.del(`reset_token:${token}`);

      return c.json({
        error: "Gmail email service is not configured"
      }, 500);
    }

    const gmailResponse = await fetch(gmailScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        secret: gmailScriptSecret,
        to: normalizedEmail,
        name: user.name ?? "there",
        resetLink: resetUrl
      })
    });

    const gmailData = await gmailResponse.json().catch(() => ({}));

    if (!gmailData.success) {
      await kv.del(`reset_token:${token}`);

      return c.json({
        error: gmailData.error || "Failed to send password reset email"
      }, 500);
    }

    return c.json({ sent: true });

  } catch (e: any) {
    console.error("Forgot password error:", e);

    return c.json({
      error: e.message || "Failed to process password reset request"
    }, 500);
  }
});






app.get("/auth/verify-reset-token/:token", async (c) => {
  try {
    const token = c.req.param("token");

    if (!token) {
      return c.json({ valid: false });
    }

    const tokenData = await kv.get(`reset_token:${token}`);

    if (!tokenData) {
      return c.json({ valid: false });
    }

    // Token expires after 5 minutes
    if (Date.now() > tokenData.expiresAt) {
      await kv.del(`reset_token:${token}`);
      return c.json({ valid: false });
    }

    const user = await kv.get(`user:${tokenData.userId}`);

    if (!user) {
      await kv.del(`reset_token:${token}`);
      return c.json({ valid: false });
    }

    return c.json({ valid: true });

  } catch (e: any) {
    console.error("Verify reset token error:", e);
    return c.json({ valid: false });
  }
});



app.post("/auth/reset-password", async (c) => {
  try {
    const { token, newPassword } = await c.req.json();

    if (!token || !newPassword) {
      return c.json({ error: "Token and new password are required" }, 400);
    }

    // Enforce strong password requirements on the backend
    if (newPassword.length < 8) {
      return c.json(
        { error: "Password must be at least 8 characters long" },
        400
      );
    }

    if (!/[A-Z]/.test(newPassword)) {
      return c.json(
        { error: "Password must contain at least one uppercase letter" },
        400
      );
    }

    if (!/[a-z]/.test(newPassword)) {
      return c.json(
        { error: "Password must contain at least one lowercase letter" },
        400
      );
    }

    if (!/[0-9]/.test(newPassword)) {
      return c.json(
        { error: "Password must contain at least one number" },
        400
      );
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return c.json(
        { error: "Password must contain at least one special character" },
        400
      );
    }

    const tokenData = await kv.get(`reset_token:${token}`);

if (!tokenData) {
  return c.json(
    { error: "Invalid or expired token" },
    400
  );
}

if (Date.now() > tokenData.expiresAt) {
  await kv.del(`reset_token:${token}`);

  return c.json(
    { error: "Invalid or expired token" },
    400
  );
}


       // Get the user associated with the reset token
    const user = await kv.get(`user:${tokenData.userId}`);

    if (!user) {
      await kv.del(`reset_token:${token}`);

      return c.json(
        { error: "Invalid or expired token" },
        400
      );
    }

    if (user.suspended === true) {
      await kv.del(`reset_token:${token}`);

      return c.json(
        { error: "Account is suspended" },
        403
      );
    }

    // Hash the new password
    user.passwordHash = bcrypt.hashSync(newPassword, 10);

    await kv.set(`user:${tokenData.userId}`, user);

    // Make the reset token unusable after successful reset
    await kv.del(`reset_token:${token}`);

    return c.json({
      message: "Password reset successful"
    });

  } catch (e: any) {
    console.error("Reset password error:", e);
    return c.json({ error: e.message }, 500);
  }
});































// ── products ───────────────────────────────────────────────────────────────

app.get("/products", async (c) => {
  try { 
    return c.json(await kv.getByPrefix("product:")); }
  catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post("/products", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    const data = await c.req.json();
    const product = { id: uid(), ...data, datePosted: now() };
    await kv.set(`product:${product.id}`, product);
    await logActivity("product", `Product added: ${product.name}`);
    return c.json(product, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.put("/products/:id", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    const pid = c.req.param("id");
    const existing = await kv.get(`product:${pid}`);
    if (!existing) return c.json({ error: "Not found" }, 404);
    const updated = { ...existing, ...await c.req.json(), id: pid };
    await kv.set(`product:${pid}`, updated);
    return c.json(updated);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});


app.delete("/products/:id", async (c) => {
  try {
    const actor = await getAdmin(c);
    if (!actor) return c.json({ error: "Admin required" }, 403);

    const id = c.req.param("id");
    const product = await kv.get(`product:${id}`);

    if (!product) {
      return c.json({ error: "Product not found" }, 404);
    }

    await moveToTrash(
      "product",
      `product:${id}`,
      product,
      actor
    );
    await kv.del(`product:${id}`);

    await logActivity(
      "product",
      `Product moved to Recycle Bin: ${product.name}`,
      actor.name
    );

    return c.json({
      ok: true,
      message: "Product moved to Recycle Bin"
    });

  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});



// ── categories ─────────────────────────────────────────────────────────────

app.get("/categories", async (c) => {
  try {
    const cats = (await kv.get("categories")) ?? DEFAULT_CATEGORIES;
    return c.json(cats);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post("/categories", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    const { name } = await c.req.json();
    const slug = name.trim().toLowerCase().replace(/\s+/g, "-");
    const cats: string[] = (await kv.get("categories")) ?? DEFAULT_CATEGORIES;
    if (cats.includes(slug)) return c.json(cats);
    const updated = [...cats, slug];
    await kv.set("categories", updated);
    return c.json(updated, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.delete("/categories/:slug", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    const slug = c.req.param("slug");
    const cats: string[] = (await kv.get("categories")) ?? DEFAULT_CATEGORIES;
    const updated = cats.filter(c => c !== slug);
    await kv.set("categories", updated);
    return c.json(updated);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ── business settings ──────────────────────────────────────────────────────

app.get("/settings", async (c) => {
  try {
    const s = (await kv.get("business_settings")) ?? DEFAULT_SETTINGS;
    return c.json(s);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});
app.put("/settings", async (c) => {
  try {
    const actor = await getAdmin(c);

    if (!actor) {
      return c.json(
        { error: "Admin required" },
        403
      );
    }

    const body = await c.req.json();

    const current =
      (await kv.get("business_settings")) ?? DEFAULT_SETTINGS;

    const updated = {
      ...current,
      ...body,
    };

    await kv.set(
      "business_settings",
      updated
    );

    await logAdminActivity(
      "business_settings_updated",
      `${actor.name} updated business settings`,
      actor.name,
      actor
    );

    return c.json(updated);

  } catch (e: any) {
    console.error("Business settings update error:", e);

    return c.json(
      {
        error:
          e.message ||
          "Failed to update business settings",
      },
      500
    );
  }
});

// ── admin security settings ──────────────────────────────────────────────────

app.get("/admin/settings", async (c) => {
  try {
    const admin = await getAdmin(c);

    if (!admin) {
      return c.json({ error: "Admin required" }, 403);
    }

    const settings =
      (await kv.get("business_settings")) ?? DEFAULT_SETTINGS;

    return c.json({
      superAdminApprovalRequired:
        settings.superAdminApprovalRequired === true,
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.put("/admin/settings", async (c) => {
  try {
    const actor = await getSuperAdmin(c);

    if (!actor) {
      return c.json({ error: "Super admin required" }, 403);
    }

    const body = await c.req.json();

    const current =
      (await kv.get("business_settings")) ?? DEFAULT_SETTINGS;

    const updated = {
      ...current,
      superAdminApprovalRequired:
        body.superAdminApprovalRequired === true,
    };

    await kv.set("business_settings", updated);

    await logAdminActivity(
      "admin_security_settings_updated",
      `Super Admin approval requirement set to ${
        updated.superAdminApprovalRequired ? "ON" : "OFF"
      }`,
      actor.name,
      actor
    );

    return c.json({
      superAdminApprovalRequired:
        updated.superAdminApprovalRequired,
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ── promotions ─────────────────────────────────────────────────────────────

app.get("/promotions", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    return c.json(await kv.getByPrefix("promotion:"));
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});
app.get("/promotions/active", async (c) => {
  try {
    const all = await kv.getByPrefix("promotion:");
    const nowDate = new Date();

    const active = all.filter((p: any) => {
      if (!p.active) return false;

      if (p.startDate && new Date(p.startDate) > nowDate) {
        return false;
      }

      if (p.endDate && new Date(p.endDate) < nowDate) {
        return false;
      }

      if (p.usageLimit && p.usageCount >= p.usageLimit) {
        return false;
      }

      return true;
    });

    return c.json(active);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});
app.post("/promotions", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    const data = await c.req.json();
    const all = await kv.getByPrefix("promotion:");
    if (all.some((p: any) => p.code.toLowerCase() === data.code.toLowerCase())) {
      return c.json({ error: "Coupon code already exists" }, 400);
    }
    const promo = { id: uid(), ...data, usageCount: 0, createdAt: now() };
    await kv.set(`promotion:${promo.id}`, promo);
    return c.json(promo, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.put("/promotions/:id", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    const existing = await kv.get(`promotion:${c.req.param("id")}`);
    if (!existing) return c.json({ error: "Not found" }, 404);
    const updated = { ...existing, ...await c.req.json(), id: c.req.param("id") };
    await kv.set(`promotion:${c.req.param("id")}`, updated);
    return c.json(updated);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.patch("/promotions/:id/toggle", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    const existing = await kv.get(`promotion:${c.req.param("id")}`);
    if (!existing) return c.json({ error: "Not found" }, 404);
    existing.active = !existing.active;
    await kv.set(`promotion:${c.req.param("id")}`, existing);
    return c.json(existing);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});


app.delete("/promotions/:id", async (c) => {
  try {
    const actor = await getAdmin(c);
    if (!actor) return c.json({ error: "Admin required" }, 403);

    const id = c.req.param("id");
    const promotion = await kv.get(`promotion:${id}`);

    if (!promotion) {
      return c.json({ error: "Promotion not found" }, 404);
    }

    await moveToTrash(
      "promotion",
      `promotion:${id}`,
      promotion,
      actor
    );

    await kv.del(`promotion:${id}`);

    await logActivity(
      "promotion",
      `Promotion moved to Recycle Bin: ${promotion.code ?? promotion.name ?? id}`,
      actor.name
    );

    return c.json({
      ok: true,
      message: "Promotion moved to Recycle Bin"
    });

  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ── stock history ──────────────────────────────────────────────────────────

app.get("/stock-history", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    return c.json((await kv.get("stock_history")) ?? []);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post("/stock-history", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    const data = await c.req.json();
    const entry = { id: uid(), ...data, createdAt: now() };
    const history: any[] = (await kv.get("stock_history")) ?? [];
    history.unshift(entry);
    await kv.set("stock_history", history.slice(0, 1000));
    return c.json(entry, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ── cart ───────────────────────────────────────────────────────────────────

app.get("/cart/:userId", async (c) => {
  try {
    const entries: any[] = (await kv.get(`cart:${c.req.param("userId")}`)) ?? [];
    const products = await kv.getByPrefix("product:");
    const items = entries.flatMap((e: any) => {
      const p = products.find((pr: any) => pr.id === e.productId);
      return p ? [{ productId: e.productId, quantity: e.quantity, product: p }] : [];
    });
    return c.json(items);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post("/cart/:userId", async (c) => {
  try {
    const { productId, quantity = 1 } = await c.req.json();
    const key = `cart:${c.req.param("userId")}`;
    const entries: any[] = (await kv.get(key)) ?? [];
    const idx = entries.findIndex((e: any) => e.productId === productId);
    if (idx >= 0) entries[idx].quantity += quantity; else entries.push({ productId, quantity });
    await kv.set(key, entries);
    return c.json({ ok: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.put("/cart/:userId/:productId", async (c) => {
  try {
    const { quantity } = await c.req.json();
    const key = `cart:${c.req.param("userId")}`;
    const entries: any[] = (await kv.get(key)) ?? [];
    const idx = entries.findIndex((e: any) => e.productId === c.req.param("productId"));
    if (idx >= 0) entries[idx].quantity = quantity;
    await kv.set(key, entries);
    return c.json({ ok: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.delete("/cart/:userId/:productId", async (c) => {
  try {
    const key = `cart:${c.req.param("userId")}`;
    const entries: any[] = ((await kv.get(key)) ?? []).filter((e: any) => e.productId !== c.req.param("productId"));
    await kv.set(key, entries);
    return c.json({ ok: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.delete("/cart/:userId", async (c) => {
  try {
    await kv.set(`cart:${c.req.param("userId")}`, []);
    return c.json({ ok: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});
// ── wishlist ───────────────────────────────────────────

app.get("/wishlist/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");

    const entries: any[] =
      (await kv.get(`wishlist:${userId}`)) ?? [];

    const products = await kv.getByPrefix("product:");

    const items = entries.flatMap((e: any) => {
      const p = products.find(
        (pr: any) => pr.id === e.productId
      );

      return p
        ? [{
            id: e.id,
            userId,
            productId: e.productId,
            product: p,
            addedAt: e.addedAt,
          }]
        : [];
    });

    return c.json(items);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post("/wishlist/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const { productId } = await c.req.json();

    if (!productId) {
      return c.json(
        { error: "Product ID is required" },
        400
      );
    }

    const key = `wishlist:${userId}`;
    const entries: any[] = (await kv.get(key)) ?? [];

    const existing = entries.find(
      (e: any) => e.productId === productId
    );

    if (existing) {
      return c.json(existing);
    }

    const product = await kv.get(`product:${productId}`);

    if (!product) {
      return c.json(
        { error: "Product not found" },
        404
      );
    }

    const item = {
      id: uid(),
      userId,
      productId,
      addedAt: now(),
    };

    entries.push(item);

    await kv.set(key, entries);

    return c.json(
      {
        ...item,
        product,
      },
      201
    );
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.delete("/wishlist/:userId/:productId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const productId = c.req.param("productId");

    const key = `wishlist:${userId}`;

    const entries: any[] =
      (await kv.get(key)) ?? [];

    const filtered = entries.filter(
      (e: any) => e.productId !== productId
    );

    await kv.set(key, filtered);

    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.delete("/wishlist/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");

    await kv.set(`wishlist:${userId}`, []);

    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Admin: view all customer wishlists
app.get("/wishlist/admin/all", async (c) => {
  try {
const admin = await getAdmin(c);

if (!admin) {
  return c.json({ error: "Admin access required" }, 403);
}

if (admin.accessLevel !== "super" && admin.permissions?.view_wishlists !== true) {
  return c.json({ error: "Permission denied" }, 403);
}
    const entries = await kv.getByPrefix("wishlist:");



const hiddenIds = new Set<string>(
  (await kv.get("admin:wishlist:hidden")) ?? []
);





    const products = await kv.getByPrefix("product:");
    const users = await kv.getByPrefix("user:");

    const items = entries.flatMap((wishlist: any) => {
      if (!Array.isArray(wishlist)) return [];

return wishlist
  .filter((item: any) => !hiddenIds.has(item.id))
  .map((item: any) => {
        const userId = item.userId;

        const user = users.find(
          (u: any) => u.id === userId
        );

        const product = products.find(
          (p: any) => p.id === item.productId
        );

        return {
          id: item.id,
          userId,

          customerName:
            user?.name ||
            user?.fullName ||
            user?.displayName ||
            "Unknown Customer",

          email: user?.email || "—",

          phone:
            user?.phone ||
            user?.phoneNumber ||
            "—",

          productId: item.productId,
          addedAt: item.addedAt || null,

          product,
        };
      });
    });

    return c.json(items);
  } catch (e: any) {
    console.error("Failed to load admin wishlists:", e);

    return c.json(
      {
        error:
          e.message ||
          "Failed to load customer wishlists",
      },
      500
    );
  }
});

// Admin: clear a wishlist item from the admin view only
app.delete("/wishlist/admin/:id", async (c) => {
  try {
    const admin = await getAdmin(c);

    if (!admin) {
      return c.json({ error: "Admin access required" }, 403);
    }

    if (
      admin.accessLevel !== "super" &&
      admin.permissions?.view_wishlists !== true
    ) {
      return c.json({ error: "Permission denied" }, 403);
    }

    const id = c.req.param("id");

    const entries = await kv.getByPrefix("wishlist:");

    for (const wishlist of entries) {
      if (!Array.isArray(wishlist)) continue;

      const item = wishlist.find(
        (entry: any) => entry.id === id
      );

      if (item) {
       const hiddenIds: string[] =
  (await kv.get("admin:wishlist:hidden")) ?? [];

if (!hiddenIds.includes(id)) {
  hiddenIds.push(id);
}

await kv.set("admin:wishlist:hidden", hiddenIds);

        return c.json({ ok: true });
      }
    }

    return c.json(
      { error: "Wishlist item not found" },
      404
    );
  } catch (e: any) {
    console.error(
      "Failed to clear admin wishlist item:",
      e
    );

    return c.json(
      { error: e.message },
      500
    );
  }
});

// ── orders ─────────────────────────────────────────────


// ── orders ─────────────────────────────────────────────────────────────────

app.post("/orders", async (c) => {
  try {
    const data = await c.req.json();
    const order = { id: uid(), ...data, createdAt: now() };
    await kv.set(`order:${order.id}`, order);
    await logActivity("order", `Order placed by ${order.customerName} — GH₵ ${order.totalAmount?.toFixed(2)}`, order.customerName);
    return c.json(order, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.get("/orders", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    return c.json(await kv.getByPrefix("order:"));
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.get("/orders/user/:userId", async (c) => {
  try {
    const all = await kv.getByPrefix("order:");
    return c.json(all.filter((o: any) => o.userId === c.req.param("userId")));
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.put("/orders/:id", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    const existing = await kv.get(`order:${c.req.param("id")}`);
    if (!existing) return c.json({ error: "Not found" }, 404);
    const updated = { ...existing, ...await c.req.json() };
    await kv.set(`order:${c.req.param("id")}`, updated);
    return c.json(updated);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.delete("/orders/:id", async (c) => {
  try {
    const actor = await getAdmin(c);
    if (!actor) return c.json({ error: "Admin required" }, 403);

    const id = c.req.param("id");
    const order = await kv.get(`order:${id}`);

    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    await moveToTrash(
      "order",
      `order:${id}`,
      order,
      actor
    );

    await kv.del(`order:${id}`);

    await logActivity(
      "order",
      `Order moved to Recycle Bin: ${id}`,
      actor.name
    );

    return c.json({
      ok: true,
      message: "Order moved to Recycle Bin"
    });

  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ── transactions ───────────────────────────────────────────────────────────

app.post("/transactions", async (c) => {
  try {
    const data = await c.req.json();
    const tx = { id: uid(), ...data, createdAt: now() };
    await kv.set(`transaction:${tx.id}`, tx);
    await logActivity("payment", `Payment ${tx.status}: GH₵ ${tx.amount?.toFixed(2)} via ${tx.paymentMethod?.replace("_", " ")}`);
    return c.json(tx, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.get("/transactions", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    return c.json(await kv.getByPrefix("transaction:"));
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.get("/transactions/user/:userId", async (c) => {
  try {
    const all = await kv.getByPrefix("transaction:");
    return c.json(all.filter((t: any) => t.userId === c.req.param("userId")));
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ── invoices ───────────────────────────────────────────────────────────────

app.post("/invoices", async (c) => {
  try {
    const data = await c.req.json();
    await kv.set(`invoice:${data.id}`, data);
    return c.json(data, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.get("/invoices/user/:userId", async (c) => {
  try {
    const all = await kv.getByPrefix("invoice:");
    return c.json(all.filter((inv: any) => inv.userId === c.req.param("userId")));
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.get("/invoices", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    return c.json(await kv.getByPrefix("invoice:"));
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ── messages ───────────────────────────────────────────────────────────────

app.post("/messages", async (c) => {
  try {
    const data = await c.req.json();
    const msg = { id: uid(), ...data, createdAt: now(), read: false };
    await kv.set(`message:${msg.id}`, msg);
    await logActivity("message", `New message from ${msg.name} (${msg.email}): "${msg.subject}"`);
    return c.json(msg, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.get("/messages", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    const all = await kv.getByPrefix("message:");
    return c.json(all.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.get("/messages/by-email/:email", async (c) => {
  try {
    const all = await kv.getByPrefix("message:");
    return c.json(all.filter((m: any) => m.email === decodeURIComponent(c.req.param("email"))));
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.put("/messages/:id", async (c) => {
  try {
    const msg = await kv.get(`message:${c.req.param("id")}`);
    if (!msg) return c.json({ error: "Not found" }, 404);
    const updates = await c.req.json();
    const updated = { ...msg, ...updates };
    await kv.set(`message:${c.req.param("id")}`, updated);
    if (updates.adminReply) await logActivity("message", `Admin replied to message from ${msg.name}`);
    return c.json(updated);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.delete("/messages/:id", async (c) => {
  try {
    const actor = await getAdmin(c);
    if (!actor) return c.json({ error: "Admin required" }, 403);

    const id = c.req.param("id");
    const message = await kv.get(`message:${id}`);

    if (!message) {
      return c.json({ error: "Message not found" }, 404);
    }

    await moveToTrash(
      "message",
      `message:${id}`,
      message,
      actor
    );

    await kv.del(`message:${id}`);

    await logActivity(
      "message",
      `Message moved to Recycle Bin from ${message.name ?? message.email ?? "customer"}`,
      actor.name
    );

    return c.json({
      ok: true,
      message: "Message moved to Recycle Bin"
    });

  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ── activity
 // ── admin activity ────────────────────────────────────────────────────────

app.get("/admin/activity", async (c) => {
  try {
    if (!await getAdmin(c)) {
      return c.json({ error: "Admin required" }, 403);
    }

    return c.json(
      (await kv.get("admin_activity_logs")) ?? []
    );
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post("/admin/activity", async (c) => {
  try {
    if (!await getAdmin(c)) {
      return c.json({ error: "Admin required" }, 403);
    }

    const entry = await c.req.json();

    const logs: any[] =
      (await kv.get("admin_activity_logs")) ?? [];

    logs.unshift({
      id: entry.id ?? uid(),

      // WHO did it
      adminId: entry.adminId ?? null,
      adminName: entry.adminName ?? "Admin",
      adminEmail: entry.adminEmail ?? null,

      // WHAT did they do
      action: entry.action ?? entry.type ?? "Admin Action",
      detail: entry.detail ?? entry.description ?? "",

      createdAt: entry.createdAt ?? now(),
    });

    await kv.set(
      "admin_activity_logs",
      logs.slice(0, 500)
    );

    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.get("/activity", async (c) => {
  try {
    if (!await getAdmin(c)) {
      return c.json({ error: "Admin required" }, 403);
    }

    return c.json(
      (await kv.get("activity_logs")) ?? []
    );
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.delete("/activity", async (c) => {
  try {
    if (!await getSuperAdmin(c)) {
      return c.json({ error: "Super admin required" }, 403);
    }

    // Customer activity
    await kv.set("activity_logs", []);

    // Admin audit
    await kv.set("admin_activity_logs", []);

    return c.json({ ok: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});
// ── customer user management ───────────────────────────────────────────────

app.get("/admin/users", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    const users = await kv.getByPrefix("user:");
    return c.json(users.filter((u: any) => u.role === "customer").map(({ passwordHash: _, ...u }: any) => u));
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});








app.put("/admin/users/:id/suspend", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    const user = await kv.get(`user:${c.req.param("id")}`);
    if (!user) return c.json({ error: "Not found" }, 404);
    const { suspended } = await c.req.json();
    user.suspended = suspended;
    await kv.set(`user:${c.req.param("id")}`, user);
    await logActivity("user", `Admin ${suspended ? "suspended" : "reinstated"}: ${user.name}`, user.name);
    return c.json({ ok: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// Change customer email — SUPER ADMIN ONLY
app.put("/admin/users/:id/email", async (c) => {
  try {
    const actor = await getSuperAdmin(c);

    if (!actor) {
      return c.json({ error: "Super admin required" }, 403);
    }

    const userId = c.req.param("id");
    const user = await kv.get(`user:${userId}`);

    if (!user) {
      return c.json({ error: "Customer not found" }, 404);
    }

    if (user.role !== "customer") {
      return c.json(
        { error: "This endpoint is only for customer accounts" },
        400
      );
    }

    const { email } = await c.req.json();

    if (!email || !String(email).trim()) {
      return c.json({ error: "New email is required" }, 400);
    }

    const newEmail = String(email).trim().toLowerCase();
    const oldEmail = String(user.email).toLowerCase();

    // Nothing to change
    if (newEmail === oldEmail) {
      return c.json({ error: "This is already the customer's email" }, 400);
    }

    // Make sure the new email isn't already attached to another account
    const existingId = await kv.get(`user_email:${newEmail}`);

    if (existingId && existingId !== userId) {
      return c.json(
        { error: "That email address is already in use" },
        400
      );
    }

    // Remove old email lookup
    await kv.del(`user_email:${oldEmail}`);

    // Update user's actual email
    user.email = newEmail;

    // Create new email lookup
    await kv.set(`user_email:${newEmail}`, userId);

    // Save customer
    await kv.set(`user:${userId}`, user);

    // Audit log
    await logAdminActivity(
      "customer_email_changed",
      `Changed customer email from ${oldEmail} to ${newEmail} for ${user.name}`,
      actor.name,
      actor
    );

    const { passwordHash: _, ...safe } = user;

    return c.json({
      ok: true,
      message: "Customer email updated successfully",
      user: safe,
    });

  } catch (e: any) {
    console.error("Customer email change error:", e);

    return c.json(
      { error: e.message || "Failed to change customer email" },
      500
    );
  }
});




app.put("/admin/users/:id/promote", async (c) => {
  try {
    const actor = await getAdmin(c);
    if (!actor) return c.json({ error: "Admin required" }, 403);

    const userId = c.req.param("id");
    const user = await kv.get(`user:${userId}`);

    if (!user) return c.json({ error: "User not found" }, 404);
    if (user.role !== "customer") {
      return c.json({ error: "User is already an admin" }, 400);
    }

    user.role = "admin";
    user.accessLevel = "restricted";
    user.permissions = user.permissions ?? {};

    await kv.set(`user:${userId}`, user);

    await logActivity(
      "user",
      `Admin promoted customer to admin: ${user.name}`,
      user.name
    );

    const { passwordHash: _, ...safe } = user;
    return c.json(safe);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});






app.put("/admin/users/:id/reset-password", async (c) => {
  try {
    const actor = await getAdmin(c);

    if (!actor) {
      return c.json({ error: "Admin required" }, 403);
    }

    const user = await kv.get(`user:${c.req.param("id")}`);

    if (!user) {
      return c.json({ error: "Not found" }, 404);
    }

    if (user.role !== "customer") {
      return c.json(
        { error: "This endpoint is only for customer accounts" },
        400
      );
    }

    const { newPassword } = await c.req.json();

    if (!newPassword || newPassword.length < 8) {
      return c.json(
        { error: "Password must be at least 8 characters long" },
        400
      );
    }

    user.passwordHash = bcrypt.hashSync(newPassword, 10);

await kv.set(`user:${c.req.param("id")}`, user);
    await logActivity("user", `Admin reset password for ${user.name}`, user.name);
    return c.json({ ok: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});
app.delete("/admin/users/:id", async (c) => {
  try {
    const actor = await getAdmin(c);
    if (!actor) return c.json({ error: "Admin required" }, 403);

    const id = c.req.param("id");
    const user = await kv.get(`user:${id}`);

    if (!user) {
      return c.json({ error: "Not found" }, 404);
    }

    if (user.role !== "customer") {
      return c.json(
        { error: "Only customer accounts can be deleted here" },
        400
      );
    }

    await moveToTrash(
      "customer",
      `user:${id}`,
      user,
      actor
    );

    await kv.del(`user:${id}`);
    await kv.del(`user_email:${user.email}`);

    await logActivity(
      "user",
      `Customer account moved to Recycle Bin: ${user.name}`,
      actor.name
    );

    return c.json({
      ok: true,
      message: "Customer moved to Recycle Bin"
    });

  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ── admin management ───────────────────────────────────────────────────────

// List all admin accounts
app.get("/admin/admins", async (c) => {
  try {
   if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    const users = await kv.getByPrefix("user:");
    return c.json(users.filter((u: any) => u.role === "admin").map(({ passwordHash: _, ...u }: any) => u));
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});


// Create a new admin account
app.post("/admin/admins", async (c) => {

  try {
    const actor = await getSuperAdmin(c);

    if (!actor) {
      return c.json({ error: "Super admin required" }, 403);
    }
    const { name, email, password, permissions } = await c.req.json();
    if (!name || !email || !password) return c.json({ error: "Name, email and password required" }, 400);
    const existing = await kv.get(`user_email:${email.toLowerCase()}`);
    if (existing) return c.json({ error: "Email already in use" }, 400);
  const passwordHash = bcrypt.hashSync(password, 10);
    const userId = uid();
    const admin = {
      id: userId,
      email: email.toLowerCase(),
      name,
      role: "admin",
      accessLevel: "restricted",
      permissions: permissions ?? {},
      suspended: false,
      createdAt: now(),
      passwordHash,
    };
    await kv.set(`user:${userId}`, admin);
    await kv.set(`user_email:${email.toLowerCase()}`, userId);
    await logActivity("user", `Super admin created new admin: ${name} (${email})`);
    const { passwordHash: _, ...safe } = admin;
    return c.json(safe, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});


// 👇 PUT THE NEW SUPER-ADMIN TRANSFER ROUTE HERE

// ── Super Admin approval requests ─────────────────────────────────────────

app.get("/admin/super-admin-approval-requests", async (c) => {
  try {
    const actor = await getSuperAdmin(c);

    if (!actor) {
      return c.json(
        { error: "Super admin required" },
        403
      );
    }

    const requests =
      (await kv.get("super_admin_approval_requests")) ?? [];

    return c.json(requests);

  } catch (e: any) {
    return c.json(
      { error: e.message },
      500
    );
  }
});

app.post("/admin/super-admin-approval-requests", async (c) => {
  try {
    const actor = await getSuperAdmin(c);

    if (!actor) {
      return c.json(
        { error: "Super admin required" },
        403
      );
    }

    const { targetAdminId } = await c.req.json();

    if (!targetAdminId) {
      return c.json(
        { error: "Target admin ID is required" },
        400
      );
    }

    const targetAdmin =
      await kv.get(`user:${targetAdminId}`);

    if (!targetAdmin || targetAdmin.role !== "admin") {
      return c.json(
        { error: "Admin account not found" },
        404
      );
    }

    if (targetAdmin.accessLevel === "super") {
      return c.json(
        { error: "This admin is already a Super Admin" },
        400
      );
    }

    if (targetAdmin.id === actor.id) {
      return c.json(
        { error: "You cannot request Super Admin access for yourself" },
        400
      );
    }

    const requests =
      (await kv.get("super_admin_approval_requests")) ?? [];

    // Prevent duplicate pending requests
    const existingRequest = requests.find(
      (request: any) =>
        request.status === "pending" &&
        request.targetAdminId === targetAdminId
    );

    if (existingRequest) {
      return c.json(
        { error: "An approval request already exists for this admin" },
        400
      );
    }

    const request = {
      id: uid(),

      type: "super_admin_promotion",

      // Person requesting the promotion
      requesterId: actor.id,
      requesterName: actor.name,
      requesterEmail: actor.email,

      // Admin who should become Super Admin
      targetAdminId: targetAdmin.id,
      targetAdminName: targetAdmin.name,
      targetAdminEmail: targetAdmin.email,

      status: "pending",

      createdAt: now(),

      approvedAt: null,
      approvedBy: null,
      approvedByName: null,
    };

    requests.unshift(request);

    await kv.set(
      "super_admin_approval_requests",
      requests.slice(0, 200)
    );

    await logAdminActivity(
      "super_admin_approval_requested",
      `${actor.email} requested Super Admin approval for ${targetAdmin.email}`,
      actor.name,
      actor
    );

    return c.json(
      {
        ok: true,
        message: "Super Admin approval request submitted",
        request,
      },
      201
    );

  } catch (e: any) {
    console.error(
      "Super Admin approval request error:",
      e
    );

    return c.json(
      {
        error:
          e.message ||
          "Failed to create approval request",
      },
      500
    );
  }
});
app.put("/admin/admins/:id/transfer-super", async (c) => {
  try {
    // The person performing the action must already be a Super Admin
    const actor = await getSuperAdmin(c);

    if (!actor) {
      return c.json(
        { error: "Super admin required" },
        403
      );
    }

    const settings =
      (await kv.get("business_settings")) ?? DEFAULT_SETTINGS;

    const newSuperId = c.req.param("id");

    const newSuper = await kv.get(`user:${newSuperId}`);

    if (!newSuper || newSuper.role !== "admin") {
      return c.json(
        { error: "Admin account not found" },
        404
      );
    }

    if (newSuper.id === actor.id) {
      return c.json(
        { error: "This account is already the super admin" },
        400
      );
    }

    if (newSuper.accessLevel === "super") {
      return c.json(
        { error: "This admin is already a super admin" },
        400
      );
    }

    // Root Super Admin
    const ROOT_SUPER_ADMIN_EMAIL =
      "danquahbertram26@gmail.com";

    const actorIsRoot =
      String(actor.email).toLowerCase() ===
      ROOT_SUPER_ADMIN_EMAIL;

    /*
     * ============================================================
     * TOGGLE BEHAVIOUR
     *
     * toggle ON:
     *   - Root Super Admin can promote immediately.
     *   - Other Super Admins must request Root approval.
     *
     * toggle OFF:
     *   - ANY Super Admin can promote immediately.
     * ============================================================
     */

    if (
      settings.superAdminApprovalRequired === true &&
      !actorIsRoot
    ) {
      // Approval is ON and this is NOT the Root Super Admin.
      // Create an approval request instead of promoting immediately.

      const requests: any[] =
        (await kv.get("super_admin_approval_requests")) ?? [];

      // Prevent duplicate pending requests
      const existingRequest = requests.find(
        (r: any) =>
          r.status === "pending" &&
          (
            r.requestedAdmin?.id === newSuper.id ||
            r.targetAdminId === newSuper.id
          )
      );

      if (existingRequest) {
        return c.json(
          {
            error:
              "An approval request already exists for this admin"
          },
          400
        );
      }

      const request = {
        id: uid(),

        type: "super_admin_promotion",

        requestedBy: {
          id: actor.id,
          name: actor.name,
          email: actor.email,
        },

        requestedAdmin: {
          id: newSuper.id,
          name: newSuper.name,
          email: newSuper.email,
        },

        status: "pending",

        createdAt: now(),

        approvedBy: null,
        approvedAt: null,

        rejectedBy: null,
        rejectedAt: null,
      };

      requests.unshift(request);

      await kv.set(
        "super_admin_approval_requests",
        requests.slice(0, 200)
      );

      await logAdminActivity(
        "super_admin_approval_requested",
        `${actor.name} requested Root Super Admin approval to promote ${newSuper.name} to Super Admin`,
        actor.name,
        actor
      );

      return c.json({
        ok: true,
        approvalRequired: true,
        status: "pending",
        message:
          "Approval request sent to the Root Super Admin.",
        request,
      });
    }

    /*
     * ============================================================
     * APPROVAL IS OFF
     * OR
     * ACTOR IS ROOT SUPER ADMIN
     *
     * Promote immediately.
     * ============================================================
     */

    newSuper.accessLevel = "super";

    await kv.set(
      `user:${newSuper.id}`,
      newSuper
    );

    await logAdminActivity(
      "super_admin_promoted",
      `${actor.name} promoted ${newSuper.name} to Super Admin`,
      actor.name,
      actor
    );

    const {
      passwordHash: _password,
      ...safeNewSuper
    } = newSuper;

    return c.json({
      ok: true,
      approvalRequired: false,
      status: "approved",
      message:
        "Super admin promotion completed successfully.",
      newSuperAdmin: safeNewSuper,
    });

  } catch (e: any) {
    console.error(
      "Super admin promotion error:",
      e
    );

    return c.json(
      {
        error:
          e.message ||
          "Failed to promote admin to super admin",
      },
      500
    );
  }
});

// ── super admin approval requests ───────────────────────────────────────

app.get("/admin/super-admin-approval-requests", async (c) => {
  try {
    const actor = await getSuperAdmin(c);

    if (!actor) {
      return c.json({ error: "Super admin required" }, 403);
    }

    const ROOT_SUPER_ADMIN_EMAIL =
      "danquahbertram26@gmail.com";

    if (
      String(actor.email).toLowerCase() !==
      ROOT_SUPER_ADMIN_EMAIL
    ) {
      return c.json(
        { error: "Root super admin required" },
        403
      );
    }

    return c.json(
      (await kv.get("super_admin_approval_requests")) ?? []
    );

  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});
app.post(
  "/admin/super-admin-approval-requests/:id/approve",
  async (c) => {
    try {
      const actor = await getSuperAdmin(c);

      if (!actor) {
        return c.json(
          { error: "Super admin required" },
          403
        );
      }

      const ROOT_SUPER_ADMIN_EMAIL =
        "danquahbertram26@gmail.com";

      if (
        String(actor.email).toLowerCase() !==
        ROOT_SUPER_ADMIN_EMAIL
      ) {
        return c.json(
          { error: "Root super admin required" },
          403
        );
      }

      const requestId = c.req.param("id");

      const requests: any[] =
        (await kv.get("super_admin_approval_requests")) ?? [];

      const request = requests.find(
        (r) => r.id === requestId
      );

      if (!request) {
        return c.json(
          { error: "Approval request not found" },
          404
        );
      }

      if (request.status !== "pending") {
        return c.json(
          { error: "This request has already been processed" },
          400
        );
      }

      const user = await kv.get(
        `user:${request.requestedAdmin.id}`
      );

      if (!user) {
        return c.json(
          { error: "Requested admin no longer exists" },
          404
        );
      }

      user.accessLevel = "super";

      await kv.set(
        `user:${user.id}`,
        user
      );

      const updatedRequests = requests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: "approved",
              approvedBy: {
                id: actor.id,
                name: actor.name,
                email: actor.email,
              },
              approvedAt: now(),
            }
          : r
      );

      await kv.set(
        "super_admin_approval_requests",
        updatedRequests
      );

      await logAdminActivity(
        "super_admin_approval_granted",
        `${actor.name} approved ${user.name} as Super Admin`,
        actor.name,
        actor
      );

      return c.json({
        ok: true,
        message: "Super Admin approval granted",
      });

    } catch (e: any) {
      console.error("Super admin approval error:", e);

      return c.json(
        { error: e.message || "Failed to approve request" },
        500
      );
    }
  }
);

app.post(
  "/admin/super-admin-approval-requests/:id/reject",
  async (c) => {
    try {
      const actor = await getSuperAdmin(c);

      if (!actor) {
        return c.json(
          { error: "Super admin required" },
          403
        );
      }

      const ROOT_SUPER_ADMIN_EMAIL =
        "danquahbertram26@gmail.com";

      if (
        String(actor.email).toLowerCase() !==
        ROOT_SUPER_ADMIN_EMAIL
      ) {
        return c.json(
          { error: "Root super admin required" },
          403
        );
      }

      const requestId = c.req.param("id");

      const requests: any[] =
        (await kv.get("super_admin_approval_requests")) ?? [];

      const request = requests.find(
        (r) => r.id === requestId
      );

      if (!request) {
        return c.json(
          { error: "Approval request not found" },
          404
        );
      }

      if (request.status !== "pending") {
        return c.json(
          { error: "This request has already been processed" },
          400
        );
      }

      const updatedRequests = requests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: "rejected",
              rejectedBy: {
                id: actor.id,
                name: actor.name,
                email: actor.email,
              },
              rejectedAt: now(),
            }
          : r
      );

      await kv.set(
        "super_admin_approval_requests",
        updatedRequests
      );

      await logAdminActivity(
        "super_admin_approval_rejected",
        `${actor.name} rejected the request to promote ${request.requestedAdmin.name} to Super Admin`,
        actor.name,
        actor
      );

      return c.json({
        ok: true,
        message: "Super Admin approval request rejected",
      });

    } catch (e: any) {
      console.error("Super admin rejection error:", e);

      return c.json(
        {
          error:
            e.message ||
            "Failed to reject approval request",
        },
        500
      );
    }
  }
);

// Update admin — SUPER ADMIN ONLY
app.put("/admin/admins/:id", async (c) => {
  try {
    const actor = await getSuperAdmin(c);

    if (!actor) {
      return c.json({ error: "Super admin required" }, 403);
    }

    const userId = c.req.param("id");
    const user = await kv.get(`user:${userId}`);

    if (!user || user.role !== "admin") {
      return c.json({ error: "Admin not found" }, 404);
    }

    const updates = await c.req.json();

    const oldEmail = String(user.email).toLowerCase();
    const newEmail = updates.email
      ? String(updates.email).trim().toLowerCase()
      : oldEmail;

    // If email is changing, make sure the new email belongs to nobody else
    if (newEmail !== oldEmail) {
      const existingId = await kv.get(`user_email:${newEmail}`);

      if (existingId && existingId !== userId) {
        return c.json(
          { error: "That email address is already in use" },
          400
        );
      }

      // Remove old email lookup
      await kv.del(`user_email:${oldEmail}`);

      // Create new email lookup
      await kv.set(`user_email:${newEmail}`, userId);
    }

    const updated = {
      ...user,

      id: userId,
      name: updates.name ?? user.name,
      email: newEmail,

      permissions:
        updates.permissions ??
        user.permissions ??
        {},

      suspended:
        typeof updates.suspended === "boolean"
          ? updates.suspended
          : user.suspended ?? false,

      // Never allow this route to accidentally change these
      role: "admin",
      accessLevel: user.accessLevel,
      passwordHash: user.passwordHash,
    };

    await kv.set(`user:${userId}`, updated);

    await logAdminActivity(
      "admin_updated",
      `Super admin updated admin account: ${updated.name}`,
      actor.name,
      actor
    );

    const { passwordHash: _, ...safe } = updated;

    return c.json(safe);

  } catch (e: any) {
    console.error("Admin update error:", e);

    return c.json(
      { error: e.message || "Failed to update admin" },
      500
    );
  }
});







// ── admin demotion ────────────────────────────────────────────────────────

// Demote an admin to a customer
app.put("/admin/admins/:id/demote", async (c) => {
  try {
    const actor = await getAdmin(c);

    if (!actor) {
      return c.json({ error: "Admin required" }, 403);
    }

    const userId = c.req.param("id");
    const user = await kv.get(`user:${userId}`);

    if (!user || user.role !== "admin") {
      return c.json({ error: "Admin not found" }, 404);
    }

    // Prevent an admin from demoting themselves
    if (user.id === actor.id) {
      return c.json(
        { error: "You cannot demote your own account" },
        400
      );
    }

    // A super admin cannot be demoted unless the person doing it is also super
    if (user.accessLevel === "super") {
      if (actor.accessLevel !== "super") {
        return c.json(
          { error: "Super admin required" },
          403
        );
      }

      const admins = await kv.getByPrefix("user:");

      const superCount = admins.filter(
        (u: any) =>
          u.role === "admin" &&
          u.accessLevel === "super"
      ).length;

      if (superCount <= 1) {
        return c.json(
          { error: "Cannot demote the last super admin" },
          400
        );
      }
    }

 user.role = "customer";
user.accessLevel = undefined;
user.permissions = {};

    await kv.set(`user:${userId}`, user);

    await logActivity(
      "user",
      `Admin demoted to customer: ${user.name}`,
      user.name
    );

    const { passwordHash: _, ...safe } = user;

    return c.json(safe);

  } catch (e: any) {
    return c.json(
      { error: e.message },
      500
    );
  }
});// Reset admin password (super admin only)
app.put("/admin/admins/:id/reset-password", async (c) => {
   try {
   const actor = await getSuperAdmin(c);

if (!actor) {
  return c.json({ error: "Super admin required" }, 403);
}

const user = await kv.get(`user:${c.req.param("id")}`);

if (!user) {
  return c.json({ error: "Not found" }, 404);
}

// Only the root super admin can reset another super admin's password.
const ROOT_SUPER_ADMIN_EMAIL = "danquahbertram26@gmail.com";

const actorIsRoot =
  String(actor.email).toLowerCase() === ROOT_SUPER_ADMIN_EMAIL;

if (user.accessLevel === "super" && !actorIsRoot) {
  return c.json(
    {
      error:
        "Only the root super admin can reset a super admin password",
    },
    403
  );
}
    if (!user) return c.json({ error: "Not found" }, 404);

      const { newPassword } = await c.req.json();

    if (!newPassword || newPassword.length < 8) {
      return c.json(
        { error: "Password must be at least 8 characters long" },
        400
      );
    }

    user.passwordHash = bcrypt.hashSync(newPassword, 10);

    await kv.set(`user:${c.req.param("id")}`, user);

    await logActivity(
      "user",
      `Super admin reset password for admin: ${user.name}`,
      actor.name
    );

    return c.json({ ok: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});


// Delete admin account// Delete admin account — move to Recycle Bin
app.delete("/admin/admins/:id", async (c) => {
  try {
    const actor = await getSuperAdmin(c);

    if (!actor) {
      return c.json({ error: "Super admin required" }, 403);
    }

    const id = c.req.param("id");
    const user = await kv.get(`user:${id}`);

    if (!user || user.role !== "admin") {
      return c.json({ error: "Admin not found" }, 404);
    }

    if (user.id === actor.id) {
      return c.json(
        { error: "Cannot delete your own account" },
        400
      );
    }

    // Prevent removing the last super admin
    if (user.accessLevel === "super") {
      const admins = await kv.getByPrefix("user:");

      const superCount = admins.filter(
        (u: any) =>
          u.role === "admin" &&
          u.accessLevel === "super"
      ).length;

      if (superCount <= 1) {
        return c.json(
          { error: "Cannot remove the last super admin" },
          400
        );
      }
    }

    // Move the admin to the Recycle Bin
    await moveToTrash(
      "admin",
      `user:${id}`,
      user,
      actor
    );

    // Remove the active account
    await kv.del(`user:${id}`);
    await kv.del(`user_email:${user.email}`);

    await logActivity(
      "user",
      `Super admin moved admin account to Recycle Bin: ${user.name} (${user.email})`,
      actor.name
    );

    return c.json({
      ok: true,
      message: "Admin account moved to Recycle Bin"
    });

  } catch (e: any) {
    return c.json(
      { error: e.message },
      500
    );
  }
});

// ── admin audit log ────────────────────────────────────────────────────────


// ── notifications ──────────────────────────────────────────────────────────

app.get("/notifications", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    return c.json((await kv.get("admin_notifications")) ?? []);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post("/notifications", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    const entry = await c.req.json();
    const all: any[] = (await kv.get("admin_notifications")) ?? [];
    all.unshift(entry);
    await kv.set("admin_notifications", all.slice(0, 200));
    return c.json({ ok: true }, 201);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.patch("/notifications/read-all", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    const all: any[] = (await kv.get("admin_notifications")) ?? [];
    await kv.set("admin_notifications", all.map(n => ({ ...n, read: true })));
    return c.json({ ok: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.patch("/notifications/:id/read", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    const id = c.req.param("id");
    const all: any[] = (await kv.get("admin_notifications")) ?? [];
    const updated = all.map(n => n.id === id ? { ...n, read: true } : n);
    await kv.set("admin_notifications", updated);
    return c.json({ ok: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.delete("/notifications", async (c) => {
  try {
    if (!await getAdmin(c)) return c.json({ error: "Admin required" }, 403);
    await kv.set("admin_notifications", []);
    return c.json({ ok: true });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

// ── payments ───────────────────────────────────────────────────────────────

app.post("/payments/initialize", async (c) => {
  try {
    const { email, amount, reference, callback_url } = await c.req.json();

    if (!email || !amount) {
      return c.json(
        { success: false, error: "Email and amount are required" },
        400
      );
    }

    const key = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!key) {
      console.error("PAYSTACK_SECRET_KEY is not configured");
      return c.json(
        { success: false, error: "Payment service is not configured" },
        500
      );
    }

    const amountInPesewas = Math.round(Number(amount) * 100);

    if (!Number.isFinite(amountInPesewas) || amountInPesewas <= 0) {
      return c.json(
        { success: false, error: "Invalid payment amount" },
        400
      );
    }

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: String(amountInPesewas),
          currency: "GHS",
          ...(reference ? { reference } : {}),
          ...(callback_url ? { callback_url } : {}),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      console.error("Paystack initialization failed:", data);

      return c.json(
        {
          success: false,
          error: data.message || "Unable to initialize payment",
        },
        400
      );
    }

    return c.json({
      success: true,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    });
  } catch (e: any) {
    console.error("Payment initialization error:", e);

    return c.json(
      {
        success: false,
        error: e.message || "Payment initialization failed",
      },
      500
    );
  }
});


app.post("/payments/verify", async (c) => {
  try {
    const { reference } = await c.req.json();
 const key = Deno.env.get("PAYSTACK_SECRET_KEY");

if (!key) {
  console.error("PAYSTACK_SECRET_KEY is not configured");

  return c.json(
    {
      success: false,
      error: "Payment service is not configured"
    },
    500
  );
}

    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${key}` },
    });

    const data = await res.json();

    if (!data.status || data.data?.status !== "success") {
      return c.json(
        { success: false, error: "Payment not successful" },
        400
      );
    }

    return c.json({ success: true, payment: data.data });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ── recycle bin ────────────────────────────────────────────────────────────

// View deleted items — SUPER ADMIN ONLY
app.get("/recycle-bin", async (c) => {
  try {
    const actor = await getSuperAdmin(c);

    if (!actor) {
      return c.json({ error: "Super admin required" }, 403);
    }

    const items = await kv.getByPrefix("trash:");

    items.sort(
      (a: any, b: any) =>
        new Date(b.deletedAt).getTime() -
        new Date(a.deletedAt).getTime()
    );

    return c.json(items);

  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});


// Restore a deleted item — SUPER ADMIN ONLY
app.post("/recycle-bin/:id/restore", async (c) => {
  try {
    const actor = await getSuperAdmin(c);

    if (!actor) {
      return c.json({ error: "Super admin required" }, 403);
    }

    const trashId = c.req.param("id");
    const item = await kv.get(`trash:${trashId}`);

    if (!item) {
      return c.json({ error: "Trash item not found" }, 404);
    }

    const existing = await kv.get(item.originalKey);

    if (existing) {
      return c.json(
        {
          error:
            "Cannot restore because an item with the original ID already exists."
        },
        409
      );
    }

    await kv.set(item.originalKey, item.data);

    // Recreate email lookup for restored customers
    if (item.type === "customer" && item.data?.email) {
      await kv.set(
        `user_email:${item.data.email.toLowerCase()}`,
        item.data.id
      );
    }

    await kv.del(`trash:${trashId}`);

    await logActivity(
      "recycle_bin",
      `Super admin restored ${item.type}: ${
        item.data?.name ?? item.originalId
      }`,
      actor.name
    );

    return c.json({
      ok: true,
      message: "Item restored successfully",
      item: item.data
    });

  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});


// Permanently delete a trash item — SUPER ADMIN ONLY
app.delete("/recycle-bin/:id", async (c) => {
  try {
    const actor = await getSuperAdmin(c);

    if (!actor) {
      return c.json({ error: "Super admin required" }, 403);
    }

    const trashId = c.req.param("id");
    const item = await kv.get(`trash:${trashId}`);

    if (!item) {
      return c.json({ error: "Trash item not found" }, 404);
    }

    await kv.del(`trash:${trashId}`);

    await logActivity(
      "recycle_bin",
      `Super admin permanently deleted ${item.type}: ${
        item.data?.name ?? item.originalId
      }`,
      actor.name
    );

    return c.json({
      ok: true,
      message: "Item permanently deleted"
    });

  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});


Deno.serve(app.fetch);