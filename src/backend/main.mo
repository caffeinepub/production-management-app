import Map "mo:core/Map";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import MixinStorage "blob-storage/Mixin";
import Float "mo:core/Float";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Migration "migration";

(with migration = Migration.run)
actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  include MixinStorage();

  ///////////////////////////////
  // User Profile Management   //
  /////////////////////////////

  public type UserProfile = {
    name : Text;
    role : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  ///////////////////////////////
  // Product Management       //
  /////////////////////////////

  public type ProductId = Nat;
  let products = Map.empty<ProductId, Product>();
  var nextProductId = 1;

  public type Product = {
    id : ProductId;
    name : Text;
    loadingTime : Nat;
    unloadingTime : Nat;
    piecesPerCycle : Nat;
    cycleTime : Nat;
  };

  module Product {
    public func compareById(a : Product, b : Product) : Order.Order {
      Nat.compare(a.id, b.id);
    };
    public func compareByName(a : Product, b : Product) : Order.Order {
      Text.compare(a.name, b.name);
    };
    public func compareByLoadingTime(a : Product, b : Product) : Order.Order {
      Nat.compare(a.loadingTime, b.loadingTime);
    };
    public func compareByUnloadingTime(a : Product, b : Product) : Order.Order {
      Nat.compare(a.unloadingTime, b.unloadingTime);
    };
    public func compareByPiecesPerCycle(a : Product, b : Product) : Order.Order {
      Nat.compare(a.piecesPerCycle, b.piecesPerCycle);
    };
  };

  public type NewProductFields = {
    name : Text;
    loadingTime : Nat;
    unloadingTime : Nat;
    piecesPerCycle : Nat;
    cycleTime : Nat;
  };

  public shared ({ caller }) func addProduct(fields : NewProductFields) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add products");
    };

    if (products.values().toArray().any(func(p) { p.name == fields.name })) {
      Runtime.trap("Product name must be unique");
    };

    let product : Product = {
      id = nextProductId;
      name = fields.name;
      loadingTime = fields.loadingTime;
      unloadingTime = fields.unloadingTime;
      piecesPerCycle = fields.piecesPerCycle;
      cycleTime = fields.cycleTime;
    };
    products.add(product.id, product);
    nextProductId += 1;
  };

  public shared ({ caller }) func updateProduct(id : ProductId, name : Text, loadingTime : Nat, unloadingTime : Nat, piecesPerCycle : Nat, cycleTime : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update products");
    };

    if (products.values().toArray().any(func(p) { p.id != id and p.name == name })) {
      Runtime.trap("Product name must be unique");
    };

    switch (products.get(id)) {
      case (null) { Runtime.trap("Product not found") };
      case (_) {
        let product : Product = {
          id;
          name;
          loadingTime;
          unloadingTime;
          piecesPerCycle;
          cycleTime;
        };
        products.add(id, product);
      };
    };
  };

  public shared ({ caller }) func deleteProduct(id : ProductId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete products");
    };
    products.remove(id);
  };

  public query func getAllProducts() : async [Product] {
    products.values().toArray();
  };

  public query func getAllProductsSortedByName() : async [Product] {
    products.values().toArray().sort(Product.compareByName);
  };

  public query func getAllProductsSortedByLoadingTime() : async [Product] {
    products.values().toArray().sort(Product.compareByLoadingTime);
  };

  public query func getAllProductsSortedByUnloadingTime() : async [Product] {
    products.values().toArray().sort(Product.compareByUnloadingTime);
  };

  public query func getAllProductsSortedByPiecesPerCycle() : async [Product] {
    products.values().toArray().sort(Product.compareByPiecesPerCycle);
  };

  ///////////////////////////////
  // Machine Management      //
  /////////////////////////////

  public type MachineId = Nat;
  let machines = Map.empty<MachineId, Machine>();
  var nextMachineId = 1;

  public type Machine = {
    id : MachineId;
    name : Text;
  };

  module Machine {
    public func compareById(a : Machine, b : Machine) : Order.Order {
      Nat.compare(a.id, b.id);
    };
    public func compareByName(a : Machine, b : Machine) : Order.Order {
      Text.compare(a.name, b.name);
    };
  };

  public type NewMachineFields = {
    name : Text;
  };

  public shared ({ caller }) func addMachine(fields : NewMachineFields) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add machines");
    };

    if (machines.values().toArray().any(func(m) { m.name == fields.name })) {
      Runtime.trap("Machine name must be unique");
    };

    let machine : Machine = {
      id = nextMachineId;
      name = fields.name;
    };
    machines.add(machine.id, machine);
    nextMachineId += 1;
  };

  public shared ({ caller }) func updateMachine(id : MachineId, name : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update machines");
    };

    if (machines.values().toArray().any(func(m) { m.id != id and m.name == name })) {
      Runtime.trap("Machine name must be unique");
    };

    switch (machines.get(id)) {
      case (null) { Runtime.trap("Machine not found") };
      case (_) {
        let machine : Machine = {
          id;
          name;
        };
        machines.add(id, machine);
      };
    };
  };

  public shared ({ caller }) func deleteMachine(id : MachineId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete machines");
    };
    machines.remove(id);
  };

  public query func getAllMachines() : async [Machine] {
    machines.values().toArray();
  };

  public query func getAllMachinesSortedByName() : async [Machine] {
    machines.values().toArray().sort(Machine.compareByName);
  };

  ///////////////////////////////
  // Operator Management     //
  /////////////////////////////

  public type OperatorId = Nat;
  let operators = Map.empty<OperatorId, Operator>();
  var nextOperatorId = 1;

  public type Operator = {
    id : OperatorId;
    name : Text;
  };

  module Operator {
    public func compareById(a : Operator, b : Operator) : Order.Order {
      Nat.compare(a.id, b.id);
    };
    public func compareByName(a : Operator, b : Operator) : Order.Order {
      Text.compare(a.name, b.name);
    };
  };

  public type NewOperatorFields = {
    name : Text;
  };

  public shared ({ caller }) func addOperator(fields : NewOperatorFields) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add operators");
    };

    if (operators.values().toArray().any(func(o) { o.name == fields.name })) {
      Runtime.trap("Operator name must be unique");
    };

    let operator : Operator = {
      id = nextOperatorId;
      name = fields.name;
    };
    operators.add(operator.id, operator);
    nextOperatorId += 1;
  };

  public shared ({ caller }) func updateOperator(id : OperatorId, name : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update operators");
    };

    if (operators.values().toArray().any(func(o) { o.id != id and o.name == name })) {
      Runtime.trap("Operator name must be unique");
    };

    switch (operators.get(id)) {
      case (null) { Runtime.trap("Operator not found") };
      case (_) {
        let operator : Operator = {
          id;
          name;
        };
        operators.add(id, operator);
      };
    };
  };

  public shared ({ caller }) func deleteOperator(id : OperatorId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete operators");
    };
    operators.remove(id);
  };

  public query func getAllOperators() : async [Operator] {
    operators.values().toArray();
  };

  public query func getAllOperatorsSortedByName() : async [Operator] {
    operators.values().toArray().sort(Operator.compareByName);
  };

  //////////////////////////////////////
  // Production Entries Management  //
  ////////////////////////////////////

  public type EntryId = Nat;
  let entries = Map.empty<EntryId, ProductionEntry>();
  var nextEntryId = 1;

  public type ProductionEntry = {
    id : EntryId;
    timestamp : Int;
    machineId : MachineId;
    operatorId : OperatorId;
    productId : ProductId;
    cycleTime : {
      minutes : Nat;
      seconds : Nat;
    };
    quantityProduced : Nat;
    numberOfPartsProduced : Nat;
    totalRunTime : RuntimeType;
    downtimeReason : Text;
    downtimeTime : {
      minutes : Nat;
      seconds : Nat;
    };
    punchIn : Int;
    punchOut : Int;
    dutyTime : TimeInterval;
    tenHourTarget : Nat;
    twelveHourTarget : Nat;
    totalOperatorHours : TimeInterval;
  };

  public type RuntimeType = {
    hours : Nat;
    minutes : Nat;
    seconds : Nat;
  };

  public type TimeInterval = {
    hours : Nat;
    minutes : Nat;
    seconds : Nat;
  };

  module ProductionEntry {
    public func compareByTimestamp(a : ProductionEntry, b : ProductionEntry) : Order.Order {
      Int.compare(a.timestamp, b.timestamp);
    };
  };

  public shared ({ caller }) func addProductionEntry(
    machineId : MachineId,
    operatorId : OperatorId,
    productId : ProductId,
    cycleTime : {
      minutes : Nat;
      seconds : Nat;
    },
    quantityProduced : Nat,
    downtimeReason : Text,
    downtimeTime : {
      minutes : Nat;
      seconds : Nat;
    },
    punchIn : Int,
    punchOut : Int,
    timestamp : ?Int,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add production entries");
    };

    let product = switch (products.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?p) { p };
    };

    let finalTimestamp = switch timestamp {
      case (null) { Time.now() };
      case (?time) { time };
    };

    let cycleTimeInSeconds = (cycleTime.minutes * 60) + cycleTime.seconds;
    let numberOfPartsProduced = product.piecesPerCycle * quantityProduced;
    let downtimeInSeconds = (downtimeTime.minutes * 60) + downtimeTime.seconds;
    let tenHourTarget = calculateTenHourTarget(cycleTimeInSeconds, product.loadingTime, product.unloadingTime);
    let twelveHourTarget = calculateTwelveHourTarget(cycleTimeInSeconds, product.loadingTime, product.unloadingTime);

    let totalRunTime = {
      hours = 0;
      minutes = 0;
      seconds = 0;
    };

    // Calculate adjusted duty time
    let dutyTime = calculateAdjustedDutyTime(punchIn, punchOut);
    let dutyTimeSeconds = convertTimeIntervalToSeconds(dutyTime);
    let totalOperatorHours = calculateTotalOperatorHours(
      dutyTimeSeconds,
      quantityProduced,
      tenHourTarget,
      twelveHourTarget,
    );

    let entry : ProductionEntry = {
      id = nextEntryId;
      timestamp = finalTimestamp;
      machineId;
      operatorId;
      productId;
      cycleTime;
      quantityProduced;
      numberOfPartsProduced;
      totalRunTime;
      downtimeReason;
      downtimeTime;
      punchIn;
      punchOut;
      dutyTime;
      tenHourTarget;
      twelveHourTarget;
      totalOperatorHours;
    };

    entries.add(nextEntryId, entry);
    nextEntryId += 1;
  };

  func calculateTenHourTarget(formCycleTimeSeconds : Nat, loadingTime : Nat, unloadingTime : Nat) : Nat {
    let productiveTimeInSeconds : Float = 34200.0; // 9.5 hours
    let totalCycleTime = formCycleTimeSeconds + loadingTime + unloadingTime;

    if (totalCycleTime == 0) {
      return 0;
    };

    let totalTimeAsFloat : Float = Int.fromNat(totalCycleTime).toFloat();
    let targetFloat : Float = productiveTimeInSeconds / totalTimeAsFloat;
    let rounded = Float.nearest(targetFloat);
    Int.abs(rounded.toInt());
  };

  func calculateTwelveHourTarget(formCycleTimeSeconds : Nat, loadingTime : Nat, unloadingTime : Nat) : Nat {
    let productiveTimeInSeconds : Float = 39600.0; // 11 hours
    let totalCycleTime = formCycleTimeSeconds + loadingTime + unloadingTime;

    if (totalCycleTime == 0) {
      return 0;
    };

    let totalTimeAsFloat : Float = Int.fromNat(totalCycleTime).toFloat();
    let targetFloat : Float = productiveTimeInSeconds / totalTimeAsFloat;
    let rounded = Float.nearest(targetFloat);
    Int.abs(rounded.toInt());
  };

  func calculateAdjustedDutyTime(punchIn : Int, punchOut : Int) : TimeInterval {
    // Utility function for converting seconds to hours, minutes, seconds
    func secondsToHMS(totalSeconds : Int) : TimeInterval {
      let totalSecondsNat = Int.abs(totalSeconds);
      let hours = (totalSecondsNat / 3600).toNat();
      let minutes = ((totalSecondsNat % 3600) / 60).toNat();
      let seconds = (totalSecondsNat % 60).toNat();
      { hours; minutes; seconds };
    };

    switch (punchOut > punchIn) {
      case (true) {
        let durationSeconds = (punchOut - punchIn) / 1_000_000_000;
        let hours = (durationSeconds / 3600).toNat();
        let remainder = Int.abs(durationSeconds % 3600);
        let totalDurationMinutes = (hours * 60).toInt() + (remainder / 60);

        // Subtract 30 minutes only if the original duration is less than 12 hours
        switch (durationSeconds >= 43200) {
          case (true) { secondsToHMS(durationSeconds) };
          case (false) {
            switch (totalDurationMinutes >= 30) {
              case (true) {
                secondsToHMS(durationSeconds - 1800);
              };
              case (false) { secondsToHMS(durationSeconds) };
            };
          };
        };
      };
      case (false) { { hours = 0; minutes = 0; seconds = 0 } };
    };
  };

  func calculateTotalOperatorHours(
    dutyTimeSeconds : Nat,
    quantityProduced : Nat,
    tenHourTarget : Nat,
    twelveHourTarget : Nat,
  ) : TimeInterval {
    var targetHours : Nat = 10;
    if (dutyTimeSeconds >= 43200) { // 12 hours
      targetHours := 12;
    };

    let target = switch targetHours {
      case 10 { tenHourTarget };
      case 12 { twelveHourTarget };
      case (_) { tenHourTarget };
    };

    if (target == 0) {
      return { hours = 0; minutes = 0; seconds = 0 };
    };

    let totalOperatorHours = (quantityProduced * targetHours * 3600) / target;
    let hours = totalOperatorHours / 3600;
    let remainder = totalOperatorHours % 3600;
    let minutes = remainder / 60;
    let seconds = remainder % 60;

    { hours; minutes; seconds };
  };

  func convertTimeIntervalToSeconds(interval : TimeInterval) : Nat {
    (interval.hours * 3600) + (interval.minutes * 60) + interval.seconds;
  };

  public query func getAllProductionEntries() : async [ProductionEntry] {
    entries.values().toArray();
  };

  public query func getProductionEntriesByDateRange(startDate : Int, endDate : Int) : async [ProductionEntry] {
    entries.values().toArray().filter(
      func(entry) {
        entry.timestamp >= startDate and entry.timestamp <= endDate
      }
    );
  };

  public query func getProductionEntriesByOperator(operatorId : OperatorId) : async [ProductionEntry] {
    entries.values().toArray().filter(
      func(entry) {
        entry.operatorId == operatorId
      }
    );
  };

  public query func getProductionEntriesByProduct(productId : ProductId) : async [ProductionEntry] {
    entries.values().toArray().filter(
      func(entry) {
        entry.productId == productId
      }
    );
  };

  public shared ({ caller }) func deleteProductionEntry(entryId : EntryId) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete production entries");
    };

    switch (entries.get(entryId)) {
      case (null) { Runtime.trap("Entry not found") };
      case (?_) {
        entries.remove(entryId);
      };
    };
  };

  public query func getAllProductsUnsorted() : async [Product] {
    products.values().toArray();
  };

  public query func getSortedProducts(sortBy : Text) : async [Product] {
    let productsArray = products.values().toArray();
    switch (sortBy) {
      case ("name") { productsArray.sort(Product.compareByName) };
      case ("loadingTime") { productsArray.sort(Product.compareByLoadingTime) };
      case ("unloadingTime") { productsArray.sort(Product.compareByUnloadingTime) };
      case ("piecesPerCycle") { productsArray.sort(Product.compareByPiecesPerCycle) };
      case (_) { productsArray };
    };
  };

  public query func getSortedProductionEntries(sortBy : Text) : async [ProductionEntry] {
    let entriesArray = entries.values().toArray();
    switch (sortBy) {
      case ("timestamp") { entriesArray.sort(ProductionEntry.compareByTimestamp) };
      case (_) { entriesArray };
    };
  };
};
