import { defineField, defineType } from "sanity";

export const banner = defineType({
  name: "banner",
  title: "Banner",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (r) => r.required() }),
    defineField({ name: "subtitle", title: "Subtitle", type: "string" }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({ name: "ctaLabel", title: "CTA label", type: "string" }),
    defineField({ name: "ctaHref", title: "CTA href", type: "string" }),
    defineField({ name: "order", title: "Sort order", type: "number", initialValue: 0 }),
  ],
});
