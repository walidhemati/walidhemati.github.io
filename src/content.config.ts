/**
 * Content collections (plan 6.1).
 *
 * HONESTY RULES, enforced here and in src/lib/work.ts:
 *  - A "TBD" string anywhere in frontmatter fails the build.
 *  - `year` renders only when `yearConfirmed: true`.
 *  - A metric renders only when `verified: true`.
 *  - An entry with `needsSignoff: true` renders only its `fallback` line.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Fails on any "TBD" placeholder left in frontmatter. */
function noTBD(value: unknown, ctx: z.RefinementCtx, path: (string | number)[] = []) {
  if (typeof value === 'string') {
    if (/\bTBD\b/i.test(value)) ctx.addIssue({ code: 'custom', message: `"TBD" placeholder at ${path.join('.') || 'root'}`, path });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => noTBD(v, ctx, [...path, i]));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) noTBD(v, ctx, [...path, k]);
  }
}

export const DOMAINS = ['ml-cv', 'android', 'scientific', 'research', 'nlp', 'web', 'mobile', 'blockchain'] as const;

export const STATUSES = [
  'current', //        ● Current role
  'live-play', //      ● Live on Google Play  (only with a confirmed Play URL)
  'android', //        ● Android app          (store status unconfirmed)
  'in-development', // ◐ In development
  'research', //       ◐ Research
  'open-source', //    ● Open source
  'coursework', //     ○ Coursework
  'archived', //       ○ Archived
] as const;

const url = z.url();

const work = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/work' }),
  schema: ({ image }) =>
    z
      .object({
        /** Index number for featured work (N.01 …); omitted for archive rows. */
        n: z.number().int().positive().optional(),
        title: z.string(),
        /** One-line impact / description. */
        line: z.string(),
        /** Index-row discipline label, e.g. "Scientific computing". */
        discipline: z.string(),
        domain: z.array(z.enum(DOMAINS)).min(1),
        year: z.number().int().min(2000).max(2100).optional(),
        /** Optional finer period, e.g. "07–09/2021". Renders only with yearConfirmed. */
        period: z.string().optional(),
        yearConfirmed: z.boolean().default(false),
        /** Shows "–now" after the year (current roles). */
        ongoing: z.boolean().default(false),
        role: z.string().optional(),
        team: z.string().optional(),
        stack: z.array(z.string()).default([]),
        status: z.enum(STATUSES),
        links: z
          .object({
            repo: url.optional(),
            demo: url.optional(),
            play: url.optional(),
            paper: url.optional(),
            privacy: url.optional(),
          })
          .default({}),
        cover: z
          .object({
            src: image(),
            alt: z.string(),
            w: z.number().int().positive().optional(),
            h: z.number().int().positive().optional(),
          })
          .optional(),
        previewVideo: z.string().optional(),
        metrics: z
          .array(
            z.object({
              label: z.string(),
              before: z.string().optional(),
              after: z.string().optional(),
              unit: z.string().optional(),
              /** Where the number comes from (README, paper, his confirmation). */
              source: z.string().optional(),
              verified: z.boolean().default(false),
            }),
          )
          .default([]),
        featured: z.boolean().default(false),
        archived: z.boolean().default(false),
        needsSignoff: z.boolean().default(false),
        /** Short line rendered instead of the case study while needsSignoff is true. */
        fallback: z.string().optional(),
        /** Meta description override. */
        description: z.string().optional(),
        /** Editorial notes for Walid; never rendered. */
        todo: z.array(z.string()).default([]),
      })
      .superRefine((data, ctx) => {
        noTBD(data, ctx);
        if (data.needsSignoff && !data.fallback) {
          ctx.addIssue({ code: 'custom', message: 'needsSignoff entries must provide a `fallback` line', path: ['fallback'] });
        }
        if (data.status === 'live-play' && !data.links.play) {
          ctx.addIssue({ code: 'custom', message: '"live-play" status requires links.play (a confirmed Play URL)', path: ['status'] });
        }
      }),
});

const now = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/now' }),
  schema: z
    .object({
      title: z.string().default('Now'),
      /** The month this entry describes. */
      month: z.coerce.date(),
      updated: z.coerce.date(),
      /** Draft entries render with a visible "draft" marker. */
      draft: z.boolean().default(false),
      /** Up to three short lines for the home "Currently" block. */
      highlights: z.array(z.string()).max(3).default([]),
    })
    .superRefine((d, ctx) => noTBD(d, ctx)),
});

export const collections = { work, now };
