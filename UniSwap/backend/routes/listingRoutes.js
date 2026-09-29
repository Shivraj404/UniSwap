const express = require("express");
const Listing = require("../models/Listing");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const router = express.Router();

// CREATE LISTING (multipart/form-data — up to 5 images under the "images" field)
router.post("/", authMiddleware, upload.array("images", 5), async (req, res) => {
  try {
    const { title, description, price, category, condition, location, phone } =
      req.body;

    if (!location || !location.trim()) {
      return res.status(400).json({
        message: "Pickup location is required",
      });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        message: "A contact mobile number is required to list an item",
      });
    }

    // Keep the seller's profile phone number in sync with whatever they
    // enter on the listing form, so buyers always see an up-to-date number
    // and the seller doesn't have to enter it separately on their profile.
    await User.findByIdAndUpdate(req.user.userId, { phone: phone.trim() });

    const imageUrls = (req.files || []).map(
      (file) => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`
    );

    const listing = await Listing.create({
      title,
      description,
      price,
      category,
      condition,
      location,
      images: imageUrls,
      seller: req.user.userId,
    });

    const populated = await listing.populate("seller", "name email college phone");

    res.status(201).json({
      message: "Listing created successfully",
      listing: populated,
    });
  } catch (error) {
    console.error("Create listing error:", error);

    if (error.message && error.message.includes("Only image files")) {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({
      message: "Failed to create listing",
      error: error.message,
    });
  }
});

// GET MY LISTINGS (any status — available or sold) for the seller dashboard.
// IMPORTANT: this must be declared before GET /:id, otherwise Express
// matches "mine" as the :id parameter and this route never gets hit.
router.get("/mine", authMiddleware, async (req, res) => {
  try {
    const listings = await Listing.find({ seller: req.user.userId })
      .populate("seller", "name email college phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Your listings fetched successfully",
      count: listings.length,
      listings,
    });
  } catch (error) {
    console.error("Get my listings error:", error);
    res.status(500).json({ message: "Failed to fetch your listings" });
  }
});

// GET ALL LISTINGS WITH SEARCH AND FILTER
router.get("/", async (req, res) => {
  try {
    const { search, category } = req.query;

    const filter = {
      status: "available",
    };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      filter.category = category;
    }

    const listings = await Listing.find(filter)
      .populate("seller", "name email college phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Listings fetched successfully",
      count: listings.length,
      listings,
    });
  } catch (error) {
    console.error("Get listings error:", error);

    res.status(500).json({
      message: "Failed to fetch listings",
      error: error.message,
    });
  }
});

// GET SINGLE LISTING (used by the Buy Now detail popup as a fallback,
// the edit-listing page, and direct-link sharing)
router.get("/:id", async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate(
      "seller",
      "name email college phone"
    );

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.status(200).json({ listing });
  } catch (error) {
    console.error("Get listing error:", error);
    res.status(500).json({ message: "Failed to fetch listing" });
  }
});

// UPDATE LISTING — owner only. Accepts multipart/form-data; if new images
// are included they replace the old set, otherwise existing images are kept.
router.put("/:id", authMiddleware, upload.array("images", 5), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Ownership check — this is the actual security boundary. Any
    // client-side "is this my listing?" check is just UX; this is what
    // stops someone else from editing your listing via a direct API call.
    if (String(listing.seller) !== String(req.user.userId)) {
      return res.status(403).json({
        message: "You can only edit your own listings",
      });
    }

    const { title, description, price, category, condition, location } = req.body;

    if (title !== undefined) listing.title = title;
    if (description !== undefined) listing.description = description;
    if (price !== undefined) listing.price = price;
    if (category !== undefined) listing.category = category;
    if (condition !== undefined) listing.condition = condition;
    if (location !== undefined) listing.location = location;

    if (req.files && req.files.length > 0) {
      listing.images = req.files.map(
        (file) => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`
      );
    }

    await listing.save();
    const populated = await listing.populate("seller", "name email college phone");

    res.status(200).json({
      message: "Listing updated successfully",
      listing: populated,
    });
  } catch (error) {
    console.error("Update listing error:", error);
    res.status(500).json({ message: "Failed to update listing", error: error.message });
  }
});

// DELETE LISTING — owner only.
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (String(listing.seller) !== String(req.user.userId)) {
      return res.status(403).json({
        message: "You can only delete your own listings",
      });
    }

    await listing.deleteOne();

    res.status(200).json({ message: "Listing deleted successfully" });
  } catch (error) {
    console.error("Delete listing error:", error);
    res.status(500).json({ message: "Failed to delete listing" });
  }
});

module.exports = router;
