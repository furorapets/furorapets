import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/lib/prisma';
import { POST as createCategoryHandler, GET as listCategoriesHandler } from '../src/app/api/categories/route';
import { POST as createBreedHandler, GET as listBreedsHandler } from '../src/app/api/breeds/route';
import { PUT as updateBreedHandler } from '../src/app/api/breeds/[id]/route';
import { NextRequest } from 'next/server';

function createMockRequest(url: string, method: string, body?: any, userId = 'usr_admin') {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-furora-user-id': userId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Phase 1: Foundations — DB, RBAC & Category/Breed Management', () => {
  beforeAll(async () => {
    // Ensure DB connection
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should have seeded 6 standard top-level categories', async () => {
    const categories = await prisma.category.findMany();
    expect(categories.length).toBeGreaterThanOrEqual(6);
    const names = categories.map((c) => c.name);
    expect(names).toContain('Dogs');
    expect(names).toContain('Cats');
    expect(names).toContain('Fish');
    expect(names).toContain('Birds');
    expect(names).toContain('Small Animals');
    expect(names).toContain('Reptiles');
  });

  it('should reject category creation from non-admin users (RBAC check)', async () => {
    // usr_sales is SALES role
    const req = createMockRequest('http://localhost:3000/api/categories', 'POST', { name: 'Exotic Birds' }, 'usr_sales');
    const res = await createCategoryHandler(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('is not authorized');
  });

  it('should allow category creation by ADMIN', async () => {
    const testCatName = `TestCat-${Date.now()}`;
    const req = createMockRequest('http://localhost:3000/api/categories', 'POST', { name: testCatName }, 'usr_admin');
    const res = await createCategoryHandler(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.name).toBe(testCatName);
  });

  it('should reject breed creation from non-admin users (RBAC check)', async () => {
    // usr_vendor_1 is VENDOR role
    const req = createMockRequest(
      'http://localhost:3000/api/breeds',
      'POST',
      { categoryId: 'cat_dogs', name: 'Rottweiler' },
      'usr_vendor_1'
    );
    const res = await createBreedHandler(req);
    expect(res.status).toBe(403);
  });

  it('should allow breed creation by ADMIN and enforce unique name per category', async () => {
    const breedName = `Breed-${Date.now()}`;
    const req = createMockRequest(
      'http://localhost:3000/api/breeds',
      'POST',
      { categoryId: 'cat_dogs', name: breedName, active: true },
      'usr_admin'
    );
    const res = await createBreedHandler(req);
    expect(res.status).toBe(201);

    // Duplicate creation should be rejected (409)
    const reqDup = createMockRequest(
      'http://localhost:3000/api/breeds',
      'POST',
      { categoryId: 'cat_dogs', name: breedName, active: true },
      'usr_admin'
    );
    const resDup = await createBreedHandler(reqDup);
    expect(resDup.status).toBe(409);
  });

  it('should toggle breed active status and filter inactive breeds for non-admins', async () => {
    const cat = await prisma.category.findUnique({ where: { name: 'Dogs' } });
    expect(cat).toBeTruthy();

    // English Bulldog was seeded as active: false
    const inactiveBreed = await prisma.breed.findFirst({
      where: { categoryId: cat!.id, active: false },
    });
    expect(inactiveBreed).toBeTruthy();

    // Non-admin query should not return inactive breed
    const reqNonAdmin = createMockRequest(
      `http://localhost:3000/api/breeds?categoryId=${cat!.id}&activeOnly=true`,
      'GET',
      undefined,
      'usr_cust_1'
    );
    const resNonAdmin = await listBreedsHandler(reqNonAdmin);
    const dataNonAdmin = await resNonAdmin.json();
    const ids = dataNonAdmin.data.map((b: any) => b.id);
    expect(ids).not.toContain(inactiveBreed!.id);

    // Admin toggles breed to active
    const reqToggle = createMockRequest(
      `http://localhost:3000/api/breeds/${inactiveBreed!.id}`,
      'PUT',
      { active: true },
      'usr_admin'
    );
    const resToggle = await updateBreedHandler(reqToggle, { params: { id: inactiveBreed!.id } });
    expect(resToggle.status).toBe(200);

    // Now non-admin should see it
    const reqNonAdminAfter = createMockRequest(
      `http://localhost:3000/api/breeds?categoryId=${cat!.id}&activeOnly=true`,
      'GET',
      undefined,
      'usr_cust_1'
    );
    const resNonAdminAfter = await listBreedsHandler(reqNonAdminAfter);
    const dataAfter = await resNonAdminAfter.json();
    const idsAfter = dataAfter.data.map((b: any) => b.id);
    expect(idsAfter).toContain(inactiveBreed!.id);

    // Revert back to inactive
    await prisma.breed.update({
      where: { id: inactiveBreed!.id },
      data: { active: false },
    });
  });
});
