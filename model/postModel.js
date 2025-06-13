const mongoose = require("mongoose");
const slugify = require("slugify");
const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "A post must have a title"],
      maxlength: [40, "A post must have less than or equal to 40 characters"],
      minlength: [
        10,
        "A post must have greater than or equal to 10 characters",
      ],
      trim: true,
    },
    slug: {
      type: String,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "A post must have a description"],
      trim: true,
    },
    postType: {
      type: String,
      required: [true, "A post must have a post type"],
      enum: {
        values: [
          "announcement",
          "news",
          "events",
          "uniforms-update",
          "careers",
        ],
        message:
          "Post type is either announcement, news, events, uniforms-update, or careers",
      },
    },
    images: {
      type: [String],
      required: [true, "A post must have at least one image"],
      validate: {
        validator: function (val) {
          if (this.postType === "events") {
            return val.length === 1; // one image for events
          }
          return true;
        },
        message: "Event posts must have exactly one image.",
      },
    },
    date: {
      type: Date,
      default: Date.now,
    },
    eventDate: {
      type: Date,
      validate: {
        validator: function (val) {
          // postype is events eventDate must be provided
          if (this.postType === "events") {
            return !!val;
          }
          return true;
        },
        message: "An event post must have an event date.",
      },
    },
    eventTime: {
      type: String, // Assuming time as a string  10:00 AM or 14:30)
      validate: {
        validator: function (val) {
          //  postype is events eventTime must be provided
          if (this.postType === "events") {
            return !!val;
          }
          return true;
        },
        message: "An event post must have an event time.",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Document Middleware
postSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    // Only regenerate if title changes
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
