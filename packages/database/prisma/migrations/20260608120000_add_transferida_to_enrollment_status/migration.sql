-- Add TRANSFERIDA to EnrollmentStatus without modifying existing records.
ALTER TYPE "EnrollmentStatus" ADD VALUE IF NOT EXISTS 'TRANSFERIDA';
