# Ibyet Academy — Admin Management Guide

> This guide is written for business owners and content managers. No technical knowledge required.

---

## Table of Contents

1. [How the Website Works — The Big Picture](#1-how-the-website-works)
2. [Logging In as Admin](#2-logging-in-as-admin)
3. [Admin Dashboard](#3-admin-dashboard)
4. [Managing Courses](#4-managing-courses)
5. [Managing Bundles](#5-managing-bundles)
6. [Managing Users](#6-managing-users)
7. [Managing Reviews](#7-managing-reviews)
8. [Managing Announcements](#8-managing-announcements)
9. [Payments & Receipts](#9-payments--receipts)
10. [When You Deploy a New Update](#10-when-you-deploy-a-new-update)

---

## 1. How the Website Works

### The Student Journey

```
Student visits the website
        ↓
Browses courses and bundles
        ↓
Watches free preview videos (no account needed)
        ↓
Creates an account / logs in
        ↓
Purchases a course or bundle (pays via Stripe in CHF)
        ↓
Gets instant access to all course videos and materials
        ↓
Watches videos, tracks progress, marks lessons complete
        ↓
Leaves a review (goes to admin for approval first)
        ↓
Downloads a receipt from their dashboard
```

### What You (Admin) Control

- **What students can buy** — you create and price the courses and bundles
- **What they can watch for free** — you mark individual videos as free previews
- **What reviews are visible** — reviews only appear publicly after you approve them
- **What news they see** — you post announcements on the website
- **Who has access** — you can suspend accounts or check user activity

### How Payments Work

1. Student clicks **Buy** on a course or bundle
2. They are taken to **Stripe's secure checkout page** (Stripe handles all card data — you never see card numbers)
3. Student pays in **CHF**
4. Stripe confirms the payment and sends a signal to your server
5. The server automatically enrolls the student in the course
6. The student is redirected to a success page and can immediately start watching

> **Important:** Money goes from the student → Stripe → your CHF bank account. Stripe takes a small processing fee (~1.5%) per transaction.

---

## 2. Logging In as Admin

1. Go to `yourwebsite.com/admin/login`
2. Enter your admin email and password
3. You will be taken to the **Admin Dashboard**

> The admin area is completely separate from the student-facing website. Students cannot access any admin pages.

---

## 3. Admin Dashboard

**URL:** `/admin/dashboard`

The dashboard is your central hub. From here you can quickly navigate to:

| Quick Action | What it does |
|---|---|
| **Upload Course** | Create a brand new course |
| **View All Courses** | See and manage every course |
| **Manage Bundles** | Create or edit course bundles |
| **Manage Users** | View all registered students |
| **Announcements** | Post news or updates on the website |
| **Reviews** | Approve or reply to student reviews |

---

## 4. Managing Courses

### 4.1 Creating a New Course

**URL:** `/admin/upload`

1. Fill in the course **title** (in English and Tajik)
2. Write a **description** (in English and Tajik)
3. Set the **price** in CHF
4. Upload a **thumbnail image** (this is what students see on the course card)
5. Set a **category**, **level** (beginner / intermediate / advanced), and **tags**
6. Click **Create Course**

The course is created but has no videos yet — add videos next.

---

### 4.2 Adding Videos to a Course

**URL:** `/admin/courses/:courseId/videos/upload`

1. Go to **Courses** → click a course → click **Manage Videos**
2. Click **Upload Video**
3. Fill in the video **title** and **description**
4. Upload the video file (MP4 recommended)
5. Set the **order** (which number in the sequence this video is)
6. Toggle **Free Preview** ON if you want this video visible to non-paying students

> **Free Preview** is your marketing tool — let students watch the first 1–2 videos for free so they can decide whether to buy.

---

### 4.3 Editing a Course

**URL:** `/admin/courses/:courseId/edit`

You can update:
- Title, description, price
- Thumbnail image
- Category, level, tags
- WhatsApp group link (if you run a student support group)
- Whether the course is publicly visible

---

### 4.4 Adding Materials (PDFs, Files)

Each course can have downloadable materials (PDFs, worksheets, etc.).

1. Go to the course → **Materials** tab
2. Upload a file and give it a title
3. Students who purchased the course can download it from the course page

---

### 4.5 Course Visibility

- A course is **visible to the public** as soon as it is created
- If you want to hide a course temporarily (e.g. while building it), edit the course and toggle it to **not public**
- Hidden courses cannot be found or purchased by students

---

## 5. Managing Bundles

A **bundle** is a package of multiple courses sold together at a discounted price.

### 5.1 Creating a Bundle

**URL:** `/admin/bundles/upload`

1. Give the bundle a **title** and **description** (English and Tajik)
2. Set the **bundle price** in CHF
3. Set the **original value** (the sum of individual course prices — used to show how much the student saves)
4. Select which **courses** are included in this bundle
5. Upload a **thumbnail**
6. Click **Create Bundle**

When a student buys a bundle, they get **instant access to all courses in it**.

### 5.2 Editing a Bundle

**URL:** `/admin/bundles/:bundleId/edit`

You can change the price, add/remove courses, update the description, or change the thumbnail at any time.

> **Note:** Students who already purchased a bundle keep their access even if you later change the bundle contents. Their existing enrollment is not affected.

---

## 6. Managing Users

**URL:** `/admin/users`

Here you can see every registered student with:
- Their name and email
- Registration date
- Which courses they have purchased
- Their account status

### Suspending a User

If a student violates terms of service:
1. Find the user in the list
2. Click on their profile
3. Toggle their account to **Suspended**

A suspended user cannot log in or access any course content. They will see a message explaining their account is suspended.

---

## 7. Managing Reviews

**URL:** `/admin/reviews`

Students can submit reviews for courses they have purchased. Reviews are **not visible to the public until you approve them**.

### Review Workflow

```
Student submits review
        ↓
Review status: PENDING (hidden from public)
        ↓
You review it in the admin panel
        ↓
APPROVE → visible on the course page immediately
REJECT  → removed, student is not notified
```

### Actions You Can Take

| Action | What it does |
|---|---|
| **Approve** | Makes the review visible on the course page |
| **Reject** | Hides the review permanently |
| **Reply** | Adds an instructor reply below the review (max 150 characters). Visible to all students. |
| **Delete** | Permanently removes the review |
| **Pin** | Pins the review to the top of the course page |

### Filtering Reviews

You can filter by:
- **Status**: Pending / Approved / Rejected
- **Rating**: 1–5 stars
- **Course**: See reviews for a specific course
- **Search**: Search by keyword in the review text

> **Real-time updates:** When you approve a review or add a reply, the student's course page updates automatically — no page refresh needed on their end.

---

## 8. Managing Announcements

**URL:** `/admin/announcements`

Announcements appear on the website to inform all visitors about news, updates, or promotions.

### Creating an Announcement

1. Click **Add Announcement**
2. Write the title and content in **English** and **Tajik**
3. Set the **date**
4. Set **order** (lower number = shown first)
5. Toggle **Active** ON to make it visible

### Hiding an Announcement

Toggle the announcement to **Inactive** — it disappears from the website but is not deleted. You can reactivate it later.

---

## 9. Payments & Receipts

### How Money Reaches You

1. Student pays via Stripe → money held by Stripe
2. Stripe pays out to your **CHF bank account** on a regular schedule (usually daily or weekly depending on your Stripe settings)
3. You can view all transactions in your **Stripe Dashboard** at `dashboard.stripe.com`

### Receipts

Students can download their own receipt from the checkout success page or their dashboard. Receipts show:
- Order ID
- Course or bundle name
- Amount paid in CHF
- Payment date
- Payment method

### Checking a Payment

If a student says they paid but cannot access the course:
1. Log into `dashboard.stripe.com`
2. Search for their email under **Customers**
3. Check if their payment has status **Succeeded**
4. If succeeded but no access, contact your developer — the webhook may have missed

### Refunds

Refunds must be issued manually from the **Stripe Dashboard**:
1. Find the payment → click **Refund**
2. Choose full or partial refund
3. Stripe returns the money to the student's card

> Refunds do **not** automatically remove the student's course access. You need to manually suspend or remove their enrollment from the Users page.

---

## 10. When You Deploy a New Update

When your developer pushes a new update to the website:

1. The website automatically detects the new version in the background
2. A notification toast appears at the **top right** of every user's screen:

```
┌─────────────────────────────────────────────┐
│  ✨ New Version Available         [Refresh] │
└─────────────────────────────────────────────┘
```

3. The user clicks **Refresh** to load the new version
4. The notification stays visible for **1 hour** — users who are in the middle of watching a video are not interrupted, they see it when convenient

> Users who ignore the notification will naturally get the new version the next time they open the website in a new tab or refresh their browser.

---

## Quick Reference — Admin URLs

| Page | URL |
|---|---|
| Admin Login | `/admin/login` |
| Dashboard | `/admin/dashboard` |
| All Courses | `/admin/courses` |
| Upload New Course | `/admin/upload` |
| All Bundles | `/admin/bundles` |
| Create Bundle | `/admin/bundles/upload` |
| All Users | `/admin/users` |
| Reviews | `/admin/reviews` |
| Announcements | `/admin/announcements` |

---

## Common Questions

**Q: A student says they paid but the course is not in their dashboard.**
> Check Stripe Dashboard to confirm payment succeeded. If it did, the webhook may have failed. Ask your developer to manually enroll the student or re-trigger the webhook.

**Q: Can I change the price of a course after students have already bought it?**
> Yes. Existing students keep their access at the price they paid. The new price only applies to future purchases.

**Q: Can I delete a course?**
> Technically yes, but be careful — students who purchased it will lose access. It is better to hide the course (set it to not public) rather than delete it.

**Q: A review contains offensive content. What do I do?**
> Go to Reviews → find the review → click **Reject** or **Delete**. It will be removed from the course page immediately.

**Q: How do I know how many students enrolled in a course?**
> Go to Courses → click the course → the enrollment count is shown on the course detail page.

**Q: Can two students share one account?**
> The system does not prevent this technically, but it is against fair use. If you suspect account sharing, you can suspend the account from the Users page.
