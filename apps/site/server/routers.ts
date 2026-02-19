import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getAllUnits,
  getUnitBySlug,
  getAllBlogCategories,
  getAllBlogTags,
  getPublishedBlogPosts,
  getBlogPostBySlug,
  searchBlogPosts,
  incrementBlogPostViews,
  subscribeNewsletter,
  unsubscribeNewsletter,
  createContactSubmission,
  createDonation,
  getTotalDonations,
  getAllProjects,
  getProjectBySlug,
  getTransparencyDocuments,
  createJobApplication,
} from "./db";
import { createCheckoutSession, createPixPayment, getPaymentStatus } from "./stripe";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Units endpoints
  units: router({
    getAll: publicProcedure.query(async () => {
      return await getAllUnits();
    }),
    
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return await getUnitBySlug(input.slug);
      }),
  }),

  // Blog endpoints
  blog: router({
    getCategories: publicProcedure.query(async () => {
      return await getAllBlogCategories();
    }),
    
    getTags: publicProcedure.query(async () => {
      return await getAllBlogTags();
    }),
    
    getPosts: publicProcedure
      .input(z.object({
        limit: z.number().optional().default(10),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ input }) => {
        return await getPublishedBlogPosts(input.limit, input.offset);
      }),
    
    getPostBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const post = await getBlogPostBySlug(input.slug);
        if (post) {
          await incrementBlogPostViews(post.id);
        }
        return post;
      }),
    
    search: publicProcedure
      .input(z.object({
        query: z.string(),
        limit: z.number().optional().default(10),
      }))
      .query(async ({ input }) => {
        return await searchBlogPosts(input.query, input.limit);
      }),
  }),

  // Newsletter endpoints
  newsletter: router({
    subscribe: publicProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await subscribeNewsletter({
          email: input.email,
          name: input.name,
          active: true,
          confirmedAt: new Date(),
        });
      }),
    
    unsubscribe: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        return await unsubscribeNewsletter(input.email);
      }),
  }),

  // Contact endpoints
  contact: router({
    submit: publicProcedure
      .input(z.object({
        name: z.string().min(2),
        email: z.string().email(),
        phone: z.string().optional(),
        subject: z.string().min(3),
        message: z.string().min(10),
        unitId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await createContactSubmission({
          name: input.name,
          email: input.email,
          phone: input.phone,
          subject: input.subject,
          message: input.message,
          unitId: input.unitId,
          status: 'new',
        });
        return { success: true };
      }),
  }),

  // Donations endpoints
  donations: router({
    create: publicProcedure
      .input(z.object({
        donorName: z.string().min(2),
        donorEmail: z.string().email(),
        donorPhone: z.string().optional(),
        amount: z.number().min(100), // Minimum R$ 1.00 (100 cents)
        frequency: z.enum(['one-time', 'monthly', 'quarterly', 'yearly']).default('one-time'),
        destinationType: z.enum(['general', 'unit', 'project']).default('general'),
        destinationId: z.number().optional(),
        paymentMethod: z.string(),
        anonymous: z.boolean().default(false),
        message: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Criar doação no banco
        const donation = await createDonation({
          donorName: input.donorName,
          donorEmail: input.donorEmail,
          donorPhone: input.donorPhone,
          amount: input.amount,
          currency: 'BRL',
          frequency: input.frequency,
          destinationType: input.destinationType,
          destinationId: input.destinationId,
          paymentMethod: input.paymentMethod,
          paymentStatus: 'pending',
          anonymous: input.anonymous,
          message: input.message,
          receiptSent: false,
        });
        return { success: true };
      }),
    
    createCheckout: publicProcedure
      .input(z.object({
        amount: z.number().min(100),
        frequency: z.enum(['once', 'monthly']),
        donorEmail: z.string().email().optional(),
        donorName: z.string().optional(),
        destination: z.string().optional(),
        message: z.string().optional(),
        isAnonymous: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        const origin = ctx.req.headers.origin || 'http://localhost:3000';
        const session = await createCheckoutSession({
          ...input,
          successUrl: `${origin}/doacoes/sucesso?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${origin}/doacoes?canceled=true`,
        });
        return session;
      }),
    
    createPixPayment: publicProcedure
      .input(z.object({
        amount: z.number().min(100),
        donorEmail: z.string().email().optional(),
        donorName: z.string().optional(),
        destination: z.string().optional(),
        message: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const payment = await createPixPayment(input);
        return payment;
      }),
    
    getPaymentStatus: publicProcedure
      .input(z.object({ paymentIntentId: z.string() }))
      .query(async ({ input }) => {
        return await getPaymentStatus(input.paymentIntentId);
      }),
    
    getTotals: publicProcedure.query(async () => {
      return await getTotalDonations();
    }),
  }),

  // Projects endpoints
  projects: router({
    getAll: publicProcedure.query(async () => {
      return await getAllProjects();
    }),
    
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        return await getProjectBySlug(input.slug);
      }),
  }),

  // Transparency endpoints
  transparency: router({
    getDocuments: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        year: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await getTransparencyDocuments(input.category, input.year);
      }),
  }),

  // Job applications endpoints
  jobs: router({
    submit: publicProcedure
      .input(z.object({
        fullName: z.string().min(3, "Nome completo é obrigatório"),
        email: z.string().email("Email inválido"),
        phone: z.string().min(10, "Telefone inválido"),
        cpf: z.string().length(14, "CPF inválido"),
        birthDate: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, "Data inválida"),
        address: z.string().min(10, "Endereço completo é obrigatório"),
        city: z.string().min(2, "Cidade é obrigatória"),
        state: z.string().length(2, "Estado inválido"),
        zipCode: z.string().regex(/^\d{5}-\d{3}$/, "CEP inválido"),
        position: z.string().min(3, "Cargo desejado é obrigatório"),
        unitId: z.number().optional(),
        education: z.string().min(3, "Escolaridade é obrigatória"),
        experience: z.string().optional(),
        skills: z.string().optional(),
        availability: z.string().optional(),
        resumeUrl: z.string().optional(),
        coverLetter: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await createJobApplication(input);
        return {
          success: true,
          message: "Candidatura enviada com sucesso! Entraremos em contato em breve.",
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
