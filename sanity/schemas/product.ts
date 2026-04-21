import { defineField, defineType } from "sanity";

export const product = defineType({
  name: "product",
  title: "Product",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Name", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({ name: "description", title: "Description", type: "text" }),
    defineField({ name: "price", title: "Price", type: "number", validation: (r) => r.min(0) }),
    defineField({ name: "compareAt", title: "Compare at", type: "number" }),
    defineField({ name: "stock", title: "Stock", type: "number", validation: (r) => r.min(0) }),
    defineField({ name: "featured", title: "Featured", type: "boolean", initialValue: false }),
    defineField({ name: "published", title: "Published", type: "boolean", initialValue: true }),
    defineField({
      name: "images",
      title: "Images",
      type: "array",
      of: [{ type: "image", options: { hotspot: true } }],
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "reference",
      to: [{ type: "category" }],
    }),
  ],
});
