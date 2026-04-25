/**
 * Database seeder.
 *
 * Run with `npx tsx src/scripts/seed.ts` to wipe the Students and
 * StudentLogs collections and repopulate them with 50 students plus
 * a sprinkling of recent IN/OUT logs. Used during local development
 * and demos. The first five entries are deterministic so the frontend
 * can hardcode their RFIDs in the simulator.
 */

import { faker } from "@faker-js/faker";
import { Student } from "../models/student.model.js";
import { StudentLog } from "../models/studentLog.model.js";
import { connectDB } from "../config/db.config.js";
import dotenv from "dotenv";

dotenv.config();

const BRANCHES = [
  "Computer Science Engineering",
  "Information Technology",
  "Electronics and Communication Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
];

const GENDERS = ["male", "female", "other"] as const;
const LOG_TYPES = ["IN", "OUT", "LEAVE"] as const;

type Gender = (typeof GENDERS)[number];

const generateEnrollment = (index: number): string => {
  const year = faker.helpers.arrayElement([2022, 2023, 2024, 2025]);
  const branchCode = faker.helpers.arrayElement([
    "BCSE",
    "BIT",
    "BECE",
    "BMME",
    "BCIV",
    "BELE",
  ]);
  const roll = String(index + 1).padStart(3, "0");
  return `${year}${branchCode}${roll}`;
};

const seedDatabase = async (): Promise<void> => {
  try {
    await connectDB();

    console.info("Cleaning database...");
    await Student.deleteMany({});
    await StudentLog.deleteMany({});

    console.info("Generating 50 students...");
    const students: Array<Record<string, unknown>> = [];
    const rfids = new Set<string>();

    const targetStudents = [
      { firstName: "Junaid", lastName: "Ashraf", enrollment: "2025BCSE093", address: "Chakpath, Anantnag", branch: "Computer Science Engineering", year: 2025, gender: "male" as const },
      { firstName: "Shahid", lastName: "Rasool", enrollment: "2025BCSE080", address: "Srinagar, JK", branch: "Computer Science Engineering", year: 2025, gender: "male" as const },
      { firstName: "Mudassir", lastName: "Ahmed", enrollment: "2025BMME001", address: "Batmaloo, JK", branch: "Mechanical Engineering", year: 2025, gender: "male" as const },
      { firstName: "Haleem", lastName: "Zargar", enrollment: "2025BIT094", address: "Srinagar, JK", branch: "Information Technology", year: 2025, gender: "male" as const },
      { firstName: "Sohaib", lastName: "Bashir", enrollment: "2025BCSE094", address: "Andhra Pradesh", branch: "Computer Science Engineering", year: 2025, gender: "male" as const },
    ];

    // Seed the deterministic students first so the frontend's simulator
    // can hard-code their RFIDs.
    for (const target of targetStudents) {
      let rfid = faker.string.hexadecimal({ length: 8, casing: "upper" });
      while (rfids.has(rfid)) {
        rfid = faker.string.hexadecimal({ length: 8, casing: "upper" });
      }
      rfids.add(rfid);

      students.push({
        ...target,
        rfid,
        picUrl: `${target.enrollment.toLowerCase()}.jpg`,
        isHosteller: faker.datatype.boolean(),
        phoneNumber: faker.phone.number({ style: "international" }),
      });
    }

    // Fill the rest with random students.
    for (let i = 0; i < 45; i++) {
      let rfid = faker.string.hexadecimal({ length: 8, casing: "upper" });
      while (rfids.has(rfid)) {
        rfid = faker.string.hexadecimal({ length: 8, casing: "upper" });
      }
      rfids.add(rfid);

      const gender: Gender = faker.helpers.arrayElement(GENDERS);
      const fakerSex: "male" | "female" | undefined =
        gender === "other" ? undefined : gender;
      const firstName = faker.person.firstName(fakerSex);
      const lastName = faker.person.lastName();
      let enrollment = generateEnrollment(i);
      while (students.some((s) => s.enrollment === enrollment)) {
        enrollment = generateEnrollment(i + 100);
      }

      students.push({
        enrollment,
        rfid,
        firstName,
        lastName,
        picUrl: `${enrollment.toLowerCase()}.jpg`,
        address: `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()}`,
        isHosteller: faker.datatype.boolean(),
        branch: faker.helpers.arrayElement(BRANCHES),
        year: parseInt(enrollment.substring(0, 4)),
        gender,
        phoneNumber: faker.phone.number({ style: "international" }),
      });
    }

    const targetRfids = students.slice(0, 5).map((s) => s.rfid);
    console.info("=== TARGET RFIDS FOR FRONTEND ===");
    console.info(JSON.stringify(targetRfids));
    console.info("=================================");

    await Student.insertMany(students);
    console.info(`Successfully seeded ${students.length} students.`);

    console.info("Generating dummy logs...");
    const logs: Array<Record<string, unknown>> = [];
    const sampleStudents = faker.helpers.arrayElements(students, 50);

    for (const student of sampleStudents) {
      const logCount = faker.number.int({ min: 1, max: 5 });
      for (let j = 0; j < logCount; j++) {
        const timestamp = faker.date.recent({ days: 30 });
        logs.push({
          enrollment: student.enrollment,
          type: faker.helpers.arrayElement(LOG_TYPES),
          timestamp,
          deleted: false,
          mode_of_entry: "RFID",
        });
      }
    }

    await StudentLog.insertMany(logs);
    console.info(`Successfully seeded ${logs.length} logs.`);

    console.info("Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
