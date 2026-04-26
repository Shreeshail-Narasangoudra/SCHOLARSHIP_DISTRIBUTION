// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ScholarshipDistribution
 * @dev Blockchain-based Scholarship Distribution Tracking System
 *      Two roles: Admin (manages everything) and User/Student (applies)
 *      Proof of Authority (PoA) consensus via Hardhat local network
 */
contract ScholarshipDistribution {

    // ===========================
    //        ENUMERATIONS
    // ===========================
    enum ScholarshipStatus { Active, Closed, Completed, Cancelled }
    enum ApplicationStatus { Submitted, UnderReview, Approved, Rejected, Disbursed }
    enum UserRole          { None, Admin, Student, Verifier }

    // ===========================
    //          STRUCTS
    // ===========================
    struct User {
        address userAddress;
        string  name;
        string  institution;
        string  studentId;
        UserRole role;
        bool    isRegistered;
        uint256 registeredAt;
    }

    struct Scholarship {
        uint256  scholarshipId;
        string   title;
        string   description;
        string   eligibilityCriteria;
        uint256  totalFund;
        uint256  perStudentAmount;
        uint256  deadline;
        uint256  maxRecipients;
        uint256  recipientCount;
        uint256  disbursedCount;
        address  createdBy;
        ScholarshipStatus status;
        uint256  createdAt;
        string[] criteria;
    }

    struct Application {
        uint256  applicationId;
        uint256  scholarshipId;
        address  applicant;
        string   studentId;
        string   cgpa;
        string   documentRef;
        uint256  score;
        string   remarks;
        ApplicationStatus status;
        uint256  submittedAt;
        uint256  reviewedAt;
        uint256  disbursedAt;
    }

    // ===========================
    //       STATE VARIABLES
    // ===========================
    address public owner;
    uint256 public scholarshipCount;
    uint256 public applicationCount;

    mapping(address => User)        public users;
    mapping(uint256 => Scholarship) public scholarships;
    mapping(uint256 => Application) public applications;
    mapping(uint256 => uint256[])   public scholarshipApplications;
    mapping(address => uint256[])   public userApplications;
    mapping(uint256 => mapping(address => bool)) public hasApplied;

    // ===========================
    //           EVENTS
    // ===========================
    event UserRegistered       (address indexed user, string name, UserRole role);
    event ScholarshipAnnounced (uint256 indexed scholarshipId, string title, address indexed createdBy);
    event ScholarshipClosed    (uint256 indexed scholarshipId);
    event ScholarshipCancelled (uint256 indexed scholarshipId);
    event ScholarshipCompleted (uint256 indexed scholarshipId);
    event ApplicationSubmitted (uint256 indexed applicationId, uint256 indexed scholarshipId, address indexed applicant);
    event ApplicationReviewed  (uint256 indexed applicationId, uint256 score);
    event ApplicationApproved  (uint256 indexed applicationId, address indexed applicant);
    event ApplicationRejected  (uint256 indexed applicationId, address indexed applicant, string reason);
    event FundsDisbursed       (uint256 indexed applicationId, address indexed recipient, uint256 amount);

    // ===========================
    //         MODIFIERS
    // ===========================
    modifier onlyAdmin() {
        require(users[msg.sender].role == UserRole.Admin, "SD: Only admin");
        _;
    }

    modifier onlyUser() {
        require(users[msg.sender].role == UserRole.Student, "SD: Only student");
        _;
    }

    modifier onlyVerifier() {
        require(users[msg.sender].role == UserRole.Verifier, "SD: Only verifier");
        _;
    }

    modifier onlyAdminOrVerifier() {
        require(
            users[msg.sender].role == UserRole.Admin || users[msg.sender].role == UserRole.Verifier,
            "SD: Only admin or verifier"
        );
        _;
    }

    modifier onlyRegistered() {
        require(users[msg.sender].isRegistered, "SD: Not registered");
        _;
    }

    // ===========================
    //        CONSTRUCTOR
    // ===========================
    constructor() {
        owner = msg.sender;
        users[msg.sender] = User({
            userAddress : msg.sender,
            name        : "System Admin",
            institution : "College Administration",
            studentId   : "",
            role        : UserRole.Admin,
            isRegistered: true,
            registeredAt: block.timestamp
        });
        emit UserRegistered(msg.sender, "System Admin", UserRole.Admin);
    }

    // ===========================
    //      USER MANAGEMENT
    // ===========================

    /**
     * @dev Backwards-compatible student registration helper.
     */
    function register(
        string memory _name,
        string memory _institution,
        string memory _studentId
    ) external {
        selfRegister(_name, _institution, _studentId, UserRole.Student);
    }

    /**
     * @dev Self-register as Student or Verifier.
     */
    function selfRegister(
        string memory _name,
        string memory _institution,
        string memory _studentId,
        UserRole _role
    ) public {
        require(!users[msg.sender].isRegistered, "SD: Already registered");
        require(bytes(_name).length > 0, "SD: Name required");
        require(
            _role == UserRole.Student || _role == UserRole.Verifier,
            "SD: Can only register as Student or Verifier"
        );

        if (_role == UserRole.Student) {
            require(bytes(_studentId).length > 0, "SD: Student ID required");
        }

        users[msg.sender] = User({
            userAddress : msg.sender,
            name        : _name,
            institution : _institution,
            studentId   : _studentId,
            role        : _role,
            isRegistered: true,
            registeredAt: block.timestamp
        });
        emit UserRegistered(msg.sender, _name, _role);
    }

    /**
     * @dev Backwards-compatible admin registration helper.
     */
    function registerAdmin(
        address _addr,
        string memory _name,
        string memory _institution
    ) external onlyAdmin {
        registerUserByAdmin(_addr, _name, _institution, "", UserRole.Admin);
    }

    /**
     * @dev Admin registers a user with any role.
     */
    function registerUserByAdmin(
        address _addr,
        string memory _name,
        string memory _institution,
        string memory _studentId,
        UserRole _role
    ) public onlyAdmin {
        require(!users[_addr].isRegistered, "SD: Already registered");
        require(bytes(_name).length > 0, "SD: Name required");
        require(_role != UserRole.None, "SD: Invalid role");

        if (_role == UserRole.Student) {
            require(bytes(_studentId).length > 0, "SD: Student ID required");
        }

        users[_addr] = User({
            userAddress : _addr,
            name        : _name,
            institution : _institution,
            studentId   : _studentId,
            role        : _role,
            isRegistered: true,
            registeredAt: block.timestamp
        });
        emit UserRegistered(_addr, _name, _role);
    }

    function getUser(address _addr) external view returns (User memory) {
        return users[_addr];
    }

    // ===========================
    //   SCHOLARSHIP MANAGEMENT
    // ===========================

    function announceScholarship(
        string   memory _title,
        string   memory _description,
        string   memory _eligibilityCriteria,
        uint256  _perStudentAmount,
        uint256  _deadline,
        uint256  _maxRecipients,
        string[] memory _criteria
    ) external payable onlyAdmin returns (uint256) {
        require(bytes(_title).length > 0,    "SD: Title required");
        require(_perStudentAmount > 0,       "SD: Amount must be > 0");
        require(_maxRecipients > 0,          "SD: Max recipients must be > 0");
        require(_deadline > block.timestamp, "SD: Deadline must be in the future");
        require(_criteria.length > 0,        "SD: Need at least one criterion");
        uint256 required = _perStudentAmount * _maxRecipients;
        require(msg.value == required,       "SD: Send exact total fund (perAmount * maxRecipients)");

        scholarshipCount++;
        Scholarship storage s = scholarships[scholarshipCount];
        s.scholarshipId       = scholarshipCount;
        s.title               = _title;
        s.description         = _description;
        s.eligibilityCriteria = _eligibilityCriteria;
        s.totalFund           = msg.value;
        s.perStudentAmount    = _perStudentAmount;
        s.deadline            = _deadline;
        s.maxRecipients       = _maxRecipients;
        s.recipientCount      = 0;
        s.disbursedCount      = 0;
        s.createdBy           = msg.sender;
        s.status              = ScholarshipStatus.Active;
        s.createdAt           = block.timestamp;
        s.criteria            = _criteria;

        emit ScholarshipAnnounced(scholarshipCount, _title, msg.sender);
        return scholarshipCount;
    }

    function closeScholarship(uint256 _id) external onlyAdmin {
        require(scholarships[_id].scholarshipId != 0,                "SD: Does not exist");
        require(scholarships[_id].status == ScholarshipStatus.Active, "SD: Not active");
        scholarships[_id].status = ScholarshipStatus.Closed;
        emit ScholarshipClosed(_id);
    }

    function cancelScholarship(uint256 _id) external onlyAdmin {
        Scholarship storage s = scholarships[_id];
        require(s.scholarshipId != 0, "SD: Does not exist");
        require(
            s.status == ScholarshipStatus.Active ||
            s.status == ScholarshipStatus.Closed,
            "SD: Cannot cancel"
        );
        s.status = ScholarshipStatus.Cancelled;

        uint256[] storage appList = scholarshipApplications[_id];
        for (uint i = 0; i < appList.length; i++) {
            ApplicationStatus st = applications[appList[i]].status;
            if (st == ApplicationStatus.Submitted) {
                applications[appList[i]].status = ApplicationStatus.Rejected;
            }
        }

        uint256 refund = s.perStudentAmount * (s.maxRecipients - s.disbursedCount);
        if (refund > 0) {
            (bool sent, ) = payable(msg.sender).call{value: refund}("");
            require(sent, "SD: Refund failed");
        }
        emit ScholarshipCancelled(_id);
    }

    function getScholarship(uint256 _id) external view returns (Scholarship memory) {
        return scholarships[_id];
    }

    function getScholarshipCriteria(uint256 _id) external view returns (string[] memory) {
        return scholarships[_id].criteria;
    }

    function getAllScholarshipIds() external view returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](scholarshipCount);
        for (uint256 i = 0; i < scholarshipCount; i++) ids[i] = i + 1;
        return ids;
    }

    // ===========================
    //   APPLICATION MANAGEMENT
    // ===========================

    function applyForScholarship(
        uint256 _scholarshipId,
        string  memory _cgpa,
        string  memory _documentRef
    ) external onlyUser returns (uint256) {
        Scholarship storage s = scholarships[_scholarshipId];
        require(s.scholarshipId != 0,                   "SD: Scholarship not found");
        require(s.status == ScholarshipStatus.Active,   "SD: Scholarship not active");
        require(block.timestamp < s.deadline,           "SD: Deadline passed");
        require(!hasApplied[_scholarshipId][msg.sender],"SD: Already applied");
        require(s.recipientCount < s.maxRecipients,     "SD: Slots full");
        require(bytes(_documentRef).length > 0,         "SD: Document reference required");

        applicationCount++;
        applications[applicationCount] = Application({
            applicationId : applicationCount,
            scholarshipId : _scholarshipId,
            applicant     : msg.sender,
            studentId     : users[msg.sender].studentId,
            cgpa          : _cgpa,
            documentRef   : _documentRef,
            score         : 0,
            remarks       : "",
            status        : ApplicationStatus.Submitted,
            submittedAt   : block.timestamp,
            reviewedAt    : 0,
            disbursedAt   : 0
        });

        scholarshipApplications[_scholarshipId].push(applicationCount);
        userApplications[msg.sender].push(applicationCount);
        hasApplied[_scholarshipId][msg.sender] = true;

        emit ApplicationSubmitted(applicationCount, _scholarshipId, msg.sender);
        return applicationCount;
    }

    /**
     * @dev Verifier reviews an application and assigns a score.
     */
    function reviewApplication(uint256 _applicationId, uint256 _score, string memory _remarks) external onlyVerifier {
        Application storage a = applications[_applicationId];
        require(a.applicationId != 0, "SD: Does not exist");
        require(a.status == ApplicationStatus.Submitted, "SD: Not in submitted state");

        a.score      = _score;
        a.remarks    = _remarks;
        a.status     = ApplicationStatus.UnderReview;
        a.reviewedAt = block.timestamp;

        emit ApplicationReviewed(_applicationId, _score);
    }

    /**
     * @dev Admin approves an application.
     */
    function approveApplication(uint256 _applicationId) external onlyAdmin {
        Application storage a = applications[_applicationId];
        require(a.applicationId != 0, "SD: Does not exist");
        require(
            a.status == ApplicationStatus.Submitted || a.status == ApplicationStatus.UnderReview,
            "SD: Not in submitted state"
        );

        Scholarship storage s = scholarships[a.scholarshipId];
        require(
            s.status == ScholarshipStatus.Active ||
            s.status == ScholarshipStatus.Closed,
            "SD: Scholarship not active"
        );
        require(s.recipientCount < s.maxRecipients, "SD: Recipient cap reached");

        a.status = ApplicationStatus.Approved;
        s.recipientCount++;

        emit ApplicationApproved(_applicationId, a.applicant);
    }

    /**
     * @dev Admin or Verifier rejects an application with reason.
     */
    function rejectApplication(uint256 _applicationId, string memory _reason) external onlyAdminOrVerifier {
        Application storage a = applications[_applicationId];
        require(a.applicationId != 0, "SD: Does not exist");
        require(
            a.status == ApplicationStatus.Submitted || a.status == ApplicationStatus.UnderReview,
            "SD: Not in submitted state"
        );

        a.status     = ApplicationStatus.Rejected;
        a.remarks    = _reason;
        a.reviewedAt = block.timestamp;

        emit ApplicationRejected(_applicationId, a.applicant, _reason);
    }

    /**
     * @dev Admin disburses funds directly to approved student's wallet.
     */
    function disburseFunds(uint256 _applicationId) external onlyAdmin {
        Application storage a = applications[_applicationId];
        require(a.applicationId != 0, "SD: Does not exist");
        require(a.status == ApplicationStatus.Approved, "SD: Not approved");

        Scholarship storage s = scholarships[a.scholarshipId];
        require(s.status != ScholarshipStatus.Cancelled, "SD: Scholarship cancelled");

        uint256 amount = s.perStudentAmount;
        require(address(this).balance >= amount, "SD: Insufficient balance");

        a.status      = ApplicationStatus.Disbursed;
        a.disbursedAt = block.timestamp;
        s.disbursedCount++;

        // Only mark as Completed when:
        // - all max recipients have been disbursed (normal full completion), OR
        // - the scholarship was explicitly closed and all approved recipients are fully disbursed.
        if (
            s.disbursedCount == s.maxRecipients ||
            (s.status == ScholarshipStatus.Closed && s.recipientCount > 0 && s.disbursedCount == s.recipientCount)
        ) {
            s.status = ScholarshipStatus.Completed;
            emit ScholarshipCompleted(a.scholarshipId);
        }

        (bool sent, ) = payable(a.applicant).call{value: amount}("");
        require(sent, "SD: Transfer failed");

        emit FundsDisbursed(_applicationId, a.applicant, amount);
    }

    // ===========================
    //         VIEW HELPERS
    // ===========================
    function getApplication(uint256 _id) external view returns (Application memory) {
        return applications[_id];
    }

    function getScholarshipApplications(uint256 _id) external view returns (uint256[] memory) {
        return scholarshipApplications[_id];
    }

    function getUserApplications(address _user) external view returns (uint256[] memory) {
        return userApplications[_user];
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {}
}
