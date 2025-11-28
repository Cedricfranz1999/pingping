import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

// Helper functions with proper typing
const randomEnumValue = <T extends Record<string, string>>(
  enumObj: T,
): T[keyof T] => {
  const values = Object.values(enumObj) as T[keyof T][];
  const randomIndex = Math.floor(Math.random() * values.length);
  return values[randomIndex]!;
};

// Create enum objects based on your schema
const ProductActionEnum = {
  ADD: "ADD",
  EDIT: "EDIT",
  DELETE: "DELETE",
} as const;

const AttendanceStatusEnum = {
  OVERTIME: "OVERTIME",
  UNDERTIME: "UNDERTIME",
  EXACT_TIME: "EXACT_TIME",
} as const;

const ProductTypeEnum = {
  TINAPA: "TINAPA",
  PASALUBONG: "PASALUBONG",
} as const;

const randomProductAction = () => randomEnumValue(ProductActionEnum);
const randomAttendanceStatus = () => randomEnumValue(AttendanceStatusEnum);

// Product data with specific images
const tinapaProducts = Array.from({ length: 12 }, (_, i) => ({
  image:
    "https://t3.ftcdn.net/jpg/02/81/77/56/360_F_281775659_jHOWgntwa6DmPBo0DC4bcEihmUzntIhS.jpg",
  name: `Tinapa ${i + 1} - ${faker.commerce.productName()}`,
  description: faker.commerce.productDescription(),
  stock: faker.number.int({ min: 10, max: 100 }),
  price: faker.commerce.price({ min: 50, max: 300 }),
  productType: "TINAPA" as const,
}));

const pasalubongProducts = Array.from({ length: 12 }, (_, i) => ({
  image: "https://www.kkday.com/en-ph/blog/wp-content/uploads/cebushamrock.jpg",
  name: `Pasalubong ${i + 1} - ${faker.commerce.productName()}`,
  description: faker.commerce.productDescription(),
  stock: faker.number.int({ min: 10, max: 100 }),
  price: faker.commerce.price({ min: 100, max: 500 }),
  productType: "PASALUBONG" as const,
}));

// Data generators with proper typing
const generateAdmins = (count: number) => {
  return Array.from({ length: count }, () => ({
    username: faker.internet.userName().toLowerCase().replace(/\s/g, "_"),
    password: faker.internet.password(),
  }));
};

const generateEmployees = (count: number) => {
  return Array.from({ length: count }, () => ({
    image: faker.datatype.boolean() ? faker.image.avatar() : undefined,
    firstname: faker.person.firstName(),
    middlename: faker.datatype.boolean()
      ? faker.person.middleName()
      : undefined,
    lastname: faker.person.lastName(),
    username: faker.internet.userName().toLowerCase().replace(/\s/g, "_"),
    password: faker.internet.password(),
    address: faker.location.streetAddress(),
    gender: faker.person.sex(),
    isactive: faker.datatype.boolean(),
    canModify: faker.datatype.boolean(),
  }));
};

const generateCategories = (count: number) => {
  return Array.from({ length: count }, () => ({
    name: faker.commerce.department(),
  }));
};

const generateFeedbacks = (count: number) => {
  return Array.from({ length: count }, () => ({
    name: faker.person.fullName(),
    email: faker.internet.email(),
    address: faker.location.streetAddress(),
    contact: faker.phone.number(),
    star: faker.number.int({ min: 1, max: 5 }),
    feedback: faker.lorem.paragraph(),
  }));
};

const generateAttendances = (employeeId: number, count: number) => {
  return Array.from({ length: count }, () => {
    const date = faker.date.recent({ days: 30 });
    const timeIn = faker.date.between({
      from: new Date(date.setHours(6, 0, 0, 0)),
      to: new Date(date.setHours(9, 0, 0, 0)),
    });
    const timeOut = faker.date.between({
      from: new Date(date.setHours(16, 0, 0, 0)),
      to: new Date(date.setHours(20, 0, 0, 0)),
    });

    return {
      employeeId,
      date,
      timeIn,
      timeOut,
      status: randomAttendanceStatus(),
    };
  });
};

const generateProductLogs = (
  productId: number,
  employeeId: number,
  count: number,
) => {
  return Array.from({ length: count }, () => {
    const action = randomProductAction();
    const oldStock = faker.number.int({ min: 0, max: 100 });
    const newStock =
      action === "ADD"
        ? oldStock + faker.number.int({ min: 1, max: 10 })
        : action === "EDIT"
          ? oldStock + faker.number.int({ min: -10, max: 10 })
          : null;
    const oldPrice = faker.commerce.price({ min: 50, max: 5000 });
    const newPrice =
      action === "EDIT" ? faker.commerce.price({ min: 50, max: 5000 }) : null;

    return {
      productId,
      employeeId,
      action,
      oldImage: faker.datatype.boolean()
        ? faker.image.urlLoremFlickr({ category: "food" })
        : undefined,
      oldStock: action !== "ADD" ? oldStock : undefined,
      oldPrice: action === "EDIT" ? oldPrice : undefined,
      newStock,
      newPrice,
    };
  });
};

async function main() {
  console.log("🌱 Starting seeding...");

  // Clear existing data
  await prisma.productLog.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.admin.deleteMany();
  await prisma.post.deleteMany();

  console.log("✅ Database cleared");

  // Seed Admins
  const admins = await prisma.admin.createMany({
    data: generateAdmins(3),
  });
  console.log(`✅ Created ${admins.count} admins`);

  // Seed Employees
  const employees = await prisma.employee.createMany({
    data: generateEmployees(10),
  });
  console.log(`✅ Created ${employees.count} employees`);

  // Seed Categories
  const generateCategories = (count: number) => {
    const names = new Set<string>();

    while (names.size < count) {
      names.add(faker.commerce.department());
    }

    return Array.from(names).map((name) => ({ name }));
  };

  // Seed Products - Tinapa (12 items)
  const tinapa = await prisma.product.createMany({
    data: tinapaProducts,
  });
  console.log(`✅ Created ${tinapa.count} Tinapa products`);

  // Seed Products - Pasalubong (12 items)
  const pasalubong = await prisma.product.createMany({
    data: pasalubongProducts,
  });
  console.log(`✅ Created ${pasalubong.count} Pasalubong products`);

  // Associate products with categories
  const allProducts = await prisma.product.findMany();
  const allCategories = await prisma.category.findMany();

  for (const product of allProducts) {
    const numCategories = faker.number.int({ min: 1, max: 3 });
    const selectedCategories = faker.helpers.arrayElements(
      allCategories,
      numCategories,
    );

    await prisma.productCategory.createMany({
      data: selectedCategories.map((category) => ({
        productId: product.id,
        categoryId: category.id,
      })),
    });
  }
  console.log(`✅ Associated products with categories`);

  // Seed Product Logs
  const allEmployees = await prisma.employee.findMany();

  for (const product of allProducts) {
    const numLogs = faker.number.int({ min: 1, max: 5 });
    const selectedEmployees = faker.helpers.arrayElements(
      allEmployees,
      numLogs,
    );

    for (const employee of selectedEmployees) {
      await prisma.productLog.createMany({
        data: generateProductLogs(product.id, employee.id, 1).map((log) => ({
          ...log,
          action: log.action,
        })),
      });
    }
  }
  console.log(`✅ Created product logs`);

  // Seed Attendances
  for (const employee of allEmployees) {
    const numAttendances = faker.number.int({ min: 15, max: 30 });
    await prisma.attendance.createMany({
      data: generateAttendances(employee.id, numAttendances).map(
        (attendance) => ({
          ...attendance,
          status: attendance.status as
            | "OVERTIME"
            | "UNDERTIME"
            | "EXACT_TIME"
            | null,
        }),
      ),
    });
  }
  console.log(`✅ Created attendance records`);

  // Seed Feedbacks
  const feedbacks = await prisma.feedback.createMany({
    data: generateFeedbacks(15),
  });
  console.log(`✅ Created ${feedbacks.count} feedbacks`);

  // Seed Posts
  const posts = await prisma.post.createMany({
    data: Array.from({ length: 5 }, () => ({
      name: faker.lorem.sentence(),
    })),
  });
  console.log(`✅ Created ${posts.count} posts`);

  // Create a default admin
  await prisma.admin.create({
    data: {
      username: "admin",
      password: "admin123",
    },
  });
  console.log(`✅ Created default admin
  `); // Seed some Product Ratings (lightweight, skip if table missing)
  try {
    const productsForRatings = allProducts.slice(0, Math.min(12, allProducts.length));
    for (const product of productsForRatings) {
      const howMany = faker.number.int({ min: 1, max: 4 });
      for (let i = 0; i < howMany; i++) {
        await prisma.productRating.create({
          data: {
            productId: product.id,
            userId: null,
            rating: faker.number.float({ min: 3, max: 5, multipleOf: 0.5 }) as unknown as number,
            comment: faker.lorem.sentence(),
          },
        });
      }
    }
    console.log('Seeded products with ratings');
  } catch (err) {
    console.warn('Skipping ratings seed (table may not exist yet):', (err as Error).message);
  }

  console.log("🌱 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

