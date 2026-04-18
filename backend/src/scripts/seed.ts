import mongoose from "mongoose";
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

const generateEnrollment = (index: number) => {
  const year = faker.helpers.arrayElement([2022, 2023, 2024, 2025]);
  const branchCode = faker.helpers.arrayElement(["BCSE", "BIT", "BECE", "BMME", "BCIV", "BELE"]);
  const roll = String(index + 1).padStart(3, "0");
  return `${year}${branchCode}${roll}`;
};

const seedDatabase = async () => {
  try {
    await connectDB();

    // Clear existing data
    console.log("Cleaning database...");
    await Student.deleteMany({});
    await StudentLog.deleteMany({});

    console.log("Generating 200 students...");
    const students = [];
    const rfids = new Set<string>();

    for (let i = 0; i < 200; i++) {
      let rfid = faker.string.hexadecimal({ length: 8, casing: "upper" });
      while (rfids.has(rfid)) {
        rfid = faker.string.hexadecimal({ length: 8, casing: "upper" });
      }
      rfids.add(rfid);

      const gender = faker.helpers.arrayElement(GENDERS);
      const firstName = faker.person.firstName(gender === "other" ? undefined : gender as any);
      const lastName = faker.person.lastName();
      const enrollment = generateEnrollment(i);

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
      });
    }

    await Student.insertMany(students);
    console.log(`Successfully seeded ${students.length} students.`);

    // Generate some logs for some students
    console.log("Generating dummy logs...");
    const logs = [];
    const sampleStudents = faker.helpers.arrayElements(students, 50);

    for (const student of sampleStudents) {
      const logCount = faker.number.int({ min: 1, max: 5 });
      for (let j = 0; j < logCount; j++) {
        const timestamp = faker.date.recent({ days: 30 });
        logs.push({
          enrollment: student.enrollment,
          type: faker.helpers.arrayElement(["ENTRY_IN", "ENTRY_OUT"]),
          timestamp,
          denied: faker.datatype.boolean({ probability: 0.1 }),
          lastedit_timestamp: timestamp,
          update_count: 0,
        });
      }
    }

    await StudentLog.insertMany(logs);
    console.log(`Successfully seeded ${logs.length} logs.`);

    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
