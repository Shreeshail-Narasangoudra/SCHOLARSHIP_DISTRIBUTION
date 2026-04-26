const { expect } = require("chai");
const { ethers }  = require("hardhat");

describe("ScholarshipDistribution", function () {
  let sd, owner, admin2, student1, student2, verifier1;
  const ONE_ETH = ethers.parseEther("1");
  const HALF_ETH = ethers.parseEther("0.5");

  // Role enum values
  const ROLE = { None: 0, Admin: 1, Student: 2, Verifier: 3 };
  const APP_STATUS = { Submitted: 0, UnderReview: 1, Approved: 2, Rejected: 3, Disbursed: 4 };
  const SCH_STATUS = { Active: 0, Closed: 1, Completed: 2, Cancelled: 3 };

  beforeEach(async function () {
    [owner, admin2, student1, student2, verifier1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ScholarshipDistribution");
    sd = await Factory.deploy();
    await sd.waitForDeployment();
  });

  // ─── User Management ────────────────────────────────────────────────────
  describe("User Management", function () {
    it("Owner is auto-registered as Admin on deploy", async function () {
      const u = await sd.getUser(owner.address);
      expect(u.isRegistered).to.be.true;
      expect(Number(u.role)).to.equal(ROLE.Admin);
    });

    it("Student can self-register", async function () {
      await sd.connect(student1).selfRegister(
        "Alice Kumar", "CS Dept", "CS2021001", ROLE.Student
      );
      const u = await sd.getUser(student1.address);
      expect(u.isRegistered).to.be.true;
      expect(Number(u.role)).to.equal(ROLE.Student);
      expect(u.name).to.equal("Alice Kumar");
    });

    it("Verifier can self-register", async function () {
      await sd.connect(verifier1).selfRegister(
        "Prof. Raj", "Finance Dept", "", ROLE.Verifier
      );
      const u = await sd.getUser(verifier1.address);
      expect(Number(u.role)).to.equal(ROLE.Verifier);
    });

    it("Admin can register another admin", async function () {
      await sd.connect(owner).registerUserByAdmin(
        admin2.address, "Admin Two", "Admin Office", "", ROLE.Admin
      );
      const u = await sd.getUser(admin2.address);
      expect(Number(u.role)).to.equal(ROLE.Admin);
    });

    it("Cannot register with None role", async function () {
      await expect(
        sd.connect(student1).selfRegister("X", "Y", "", ROLE.None)
      ).to.be.revertedWith("SD: Can only register as Student or Verifier");
    });

    it("Cannot register twice", async function () {
      await sd.connect(student1).selfRegister("A", "B", "ID1", ROLE.Student);
      await expect(
        sd.connect(student1).selfRegister("A", "B", "ID1", ROLE.Student)
      ).to.be.revertedWith("SD: Already registered");
    });
  });

  // ─── Scholarship Announcement ────────────────────────────────────────────
  describe("Scholarship Announcement", function () {
    it("Admin can announce scholarship with correct ETH", async function () {
      const perAmount = ethers.parseEther("1");
      const maxRecipients = 3n;
      const total = perAmount * maxRecipients;
      const deadline = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        sd.connect(owner).announceScholarship(
          "Merit Scholarship", "For top students", "CGPA >= 8.0",
          perAmount, deadline, maxRecipients, ["CGPA >= 8.0", "No backlogs"],
          { value: total }
        )
      ).to.emit(sd, "ScholarshipAnnounced");

      const sch = await sd.getScholarship(1n);
      expect(sch.title).to.equal("Merit Scholarship");
      expect(Number(sch.status)).to.equal(SCH_STATUS.Active);
      expect(sch.totalFund).to.equal(total);
    });

    it("Reverts if ETH sent doesn't match total fund", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await expect(
        sd.connect(owner).announceScholarship(
          "Bad Fund", "desc", "criteria",
          ONE_ETH, deadline, 3n, ["c1"],
          { value: ONE_ETH } // should be 3 ETH
        )
      ).to.be.revertedWith("SD: Send exact total fund (perAmount * maxRecipients)");
    });

    it("Reverts if deadline is in the past", async function () {
      const pastDeadline = Math.floor(Date.now() / 1000) - 100;
      await expect(
        sd.connect(owner).announceScholarship(
          "Past", "desc", "criteria",
          ONE_ETH, pastDeadline, 2n, ["c1"],
          { value: ethers.parseEther("2") }
        )
      ).to.be.revertedWith("SD: Deadline must be in the future");
    });

    it("Non-admin cannot announce scholarship", async function () {
      await sd.connect(student1).selfRegister("S", "I", "ID", ROLE.Student);
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await expect(
        sd.connect(student1).announceScholarship(
          "T", "D", "E", ONE_ETH, deadline, 1n, ["c1"], { value: ONE_ETH }
        )
      ).to.be.revertedWith("SD: Only admin");
    });
  });

  // ─── Application Flow ────────────────────────────────────────────────────
  describe("Application Flow", function () {
    let scholarshipId;
    const perAmt   = ethers.parseEther("1");
    const maxRec   = 2n;

    beforeEach(async function () {
      const deadline = Math.floor(Date.now() / 1000) + 86400;
      await sd.connect(owner).announceScholarship(
        "Need-Based Aid", "For economically weaker sections", "Family income < 3LPA",
        perAmt, deadline, maxRec, ["Income < 3LPA", "First-generation"],
        { value: perAmt * maxRec }
      );
      scholarshipId = 1n;

      await sd.connect(student1).selfRegister("Alice", "CS", "CS001", ROLE.Student);
      await sd.connect(student2).selfRegister("Bob",   "EE", "EE002", ROLE.Student);
      await sd.connect(verifier1).selfRegister("Prof X", "Admin", "", ROLE.Verifier);
    });

    it("Student can apply for active scholarship", async function () {
      await expect(
        sd.connect(student1).applyForScholarship(scholarshipId, "8.5", "Qmhash123")
      ).to.emit(sd, "ApplicationSubmitted");

      const app = await sd.getApplication(1n);
      expect(app.applicant).to.equal(student1.address);
      expect(Number(app.status)).to.equal(APP_STATUS.Submitted);
    });

    it("Cannot apply twice for same scholarship", async function () {
      await sd.connect(student1).applyForScholarship(scholarshipId, "8.5", "hash1");
      await expect(
        sd.connect(student1).applyForScholarship(scholarshipId, "8.5", "hash2")
      ).to.be.revertedWith("SD: Already applied");
    });

    it("Verifier can review application and set score", async function () {
      await sd.connect(student1).applyForScholarship(scholarshipId, "8.5", "hash1");
      await expect(
        sd.connect(verifier1).reviewApplication(1n, 85, "Meets all criteria")
      ).to.emit(sd, "ApplicationReviewed").withArgs(1n, 85);

      const app = await sd.getApplication(1n);
      expect(app.score).to.equal(85n);
      expect(Number(app.status)).to.equal(APP_STATUS.UnderReview);
    });

    it("Admin can approve application", async function () {
      await sd.connect(student1).applyForScholarship(scholarshipId, "8.5", "hash1");
      await sd.connect(verifier1).reviewApplication(1n, 85, "Good");
      await expect(
        sd.connect(owner).approveApplication(1n)
      ).to.emit(sd, "ApplicationApproved");

      const app = await sd.getApplication(1n);
      expect(Number(app.status)).to.equal(APP_STATUS.Approved);
    });

    it("Admin can disburse funds to approved student", async function () {
      await sd.connect(student1).applyForScholarship(scholarshipId, "8.5", "hash1");
      await sd.connect(verifier1).reviewApplication(1n, 90, "Eligible");
      await sd.connect(owner).approveApplication(1n);

      const balBefore = await ethers.provider.getBalance(student1.address);
      await expect(
        sd.connect(owner).disburseFunds(1n)
      ).to.emit(sd, "FundsDisbursed");

      const balAfter = await ethers.provider.getBalance(student1.address);
      expect(balAfter - balBefore).to.equal(perAmt);

      const app = await sd.getApplication(1n);
      expect(Number(app.status)).to.equal(APP_STATUS.Disbursed);
    });

    it("Scholarship marked Completed when all recipients disbursed", async function () {
      // Apply and process student1
      await sd.connect(student1).applyForScholarship(scholarshipId, "9.0", "hash1");
      await sd.connect(owner).approveApplication(1n);
      // Apply and process student2
      await sd.connect(student2).applyForScholarship(scholarshipId, "8.8", "hash2");
      await sd.connect(owner).approveApplication(2n);

      await sd.connect(owner).disburseFunds(1n);
      await expect(sd.connect(owner).disburseFunds(2n))
        .to.emit(sd, "ScholarshipCompleted");

      const sch = await sd.getScholarship(scholarshipId);
      expect(Number(sch.status)).to.equal(SCH_STATUS.Completed);
    });

    it("Admin or verifier can reject application with reason", async function () {
      await sd.connect(student1).applyForScholarship(scholarshipId, "6.0", "hash1");
      await expect(
        sd.connect(owner).rejectApplication(1n, "CGPA below threshold")
      ).to.emit(sd, "ApplicationRejected");

      const app = await sd.getApplication(1n);
      expect(Number(app.status)).to.equal(APP_STATUS.Rejected);
    });

    it("Admin can cancel scholarship and refund unused funds", async function () {
      const contractBalBefore = await sd.getContractBalance();
      await expect(
        sd.connect(owner).cancelScholarship(scholarshipId)
      ).to.emit(sd, "ScholarshipCancelled");

      const sch = await sd.getScholarship(scholarshipId);
      expect(Number(sch.status)).to.equal(SCH_STATUS.Cancelled);
    });
  });

  // ─── Access Control ──────────────────────────────────────────────────────
  describe("Access Control", function () {
    it("Student cannot disburse funds", async function () {
      await sd.connect(student1).selfRegister("S", "I", "ID", ROLE.Student);
      await expect(
        sd.connect(student1).disburseFunds(1n)
      ).to.be.revertedWith("SD: Only admin");
    });

    it("Non-registered wallet cannot apply", async function () {
      await expect(
        sd.connect(student1).applyForScholarship(1n, "8.0", "hash")
      ).to.be.revertedWith("SD: Only student");
    });
  });
});
