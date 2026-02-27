import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Float "mo:core/Float";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Text "mo:core/Text";
import Iter "mo:core/Iter";

actor {
  // Components
  include MixinStorage();

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  ///////////
  // Types //
  ///////////
  public type UserProfile = {
    name : Text;
    role : Text;
  };

  public type Product = {
    id : ProductId;
    name : Text;
    loadingTime : Nat;
    unloadingTime : Nat;
    piecesPerCycle : Nat;
    cycleTime : Nat;
  };

  public type Machine = {
    id : MachineId;
    name : Text;
  };

  public type Operator = {
    id : OperatorId;
    name : Text;
  };

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
    totalRunTime : {
      hours : Nat;
      minutes : Nat;
      seconds : Nat;
    };
    downtimeReason : Text;
    downtimeTime : {
      minutes : Nat;
      seconds : Nat;
    };
    punchIn : Int;
    punchOut : Int;
    dutyTime : {
      hours : Nat;
      minutes : Nat;
      seconds : Nat;
    };
    tenHourTarget : Nat;
    twelveHourTarget : Nat;
    totalOperatorHours : {
      hours : Nat;
      minutes : Nat;
      seconds : Nat;
    };
  };

  public type ProductId = Nat;
  public type MachineId = Nat;
  public type OperatorId = Nat;
  public type EntryId = Nat;

  public type ProductEntry = {
    id : ProductId;
    name : Text;
    loadingTime : Nat;
    unloadingTime : Nat;
    piecesPerCycle : Nat;
    cycleTime : Nat;
  };

  public type NewProductFields = {
    name : Text;
    loadingTime : Nat;
    unloadingTime : Nat;
    piecesPerCycle : Nat;
    cycleTime : Nat;
  };

  public type MachineEntry = {
    id : Nat;
    name : Text;
  };

  public type NewMachineFields = {
    name : Text;
  };

  public type OperatorEntry = {
    id : Nat;
    name : Text;
  };

  public type NewOperatorFields = {
    name : Text;
  };

  public type ProductionEntryEntry = {
    id : Nat;
    timestamp : Int;
    machineId : Nat;
    operatorId : Nat;
    productId : Nat;
    cycleTime : {
      minutes : Nat;
      seconds : Nat;
    };
    quantityProduced : Nat;
    numberOfPartsProduced : Nat;
    totalRunTime : {
      hours : Nat;
      minutes : Nat;
      seconds : Nat;
    };
    downtimeReason : Text;
    downtimeTime : {
      minutes : Nat;
      seconds : Nat;
    };
    punchIn : Int;
    punchOut : Int;
    dutyTime : {
      hours : Nat;
      minutes : Nat;
      seconds : Nat;
    };
    tenHourTarget : Nat;
    twelveHourTarget : Nat;
    totalOperatorHours : {
      hours : Nat;
      minutes : Nat;
      seconds : Nat;
    };
  };

  ///////////////////////////////
  // Compare Functions         //
  ///////////////////////////////
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

  module Machine {
    public func compareById(a : Machine, b : Machine) : Order.Order {
      Nat.compare(a.id, b.id);
    };
    public func compareByName(a : Machine, b : Machine) : Order.Order {
      Text.compare(a.name, b.name);
    };
  };

  module Operator {
    public func compareById(a : Operator, b : Operator) : Order.Order {
      Nat.compare(a.id, b.id);
    };
    public func compareByName(a : Operator, b : Operator) : Order.Order {
      Text.compare(a.name, b.name);
    };
  };

  module ProductionEntry {
    public func compareByTimestamp(a : ProductionEntry, b : ProductionEntry) : Order.Order {
      Int.compare(a.timestamp, b.timestamp);
    };
  };

  ///////////////////////////////
  // State                     //
  ///////////////////////////////
  let userProfiles = Map.empty<Principal, UserProfile>();
  let products = Map.empty<ProductId, Product>();
  let machines = Map.empty<MachineId, Machine>();
  let operators = Map.empty<OperatorId, Operator>();
  let entries = Map.empty<EntryId, ProductionEntry>();

  var nextProductId = 1;
  var nextMachineId = 1;
  var nextOperatorId = 1;
  var nextEntryId = 1;

  ///////////////////////////////
  // User Profile Management   //
  ///////////////////////////////
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get profiles");
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
  // Product Management        //
  ///////////////////////////////
  public query ({ caller }) func getAllProducts() : async [Product] {
    products.values().toArray();
  };

  public query ({ caller }) func getProductById(id : ProductId) : async ?Product {
    products.get(id);
  };

  public shared ({ caller }) func addProduct(productData : NewProductFields) : async ProductId {
    let id = nextProductId;
    nextProductId += 1;

    let newProduct : Product = {
      id;
      name = productData.name;
      loadingTime = productData.loadingTime;
      unloadingTime = productData.unloadingTime;
      piecesPerCycle = productData.piecesPerCycle;
      cycleTime = productData.cycleTime;
    };

    products.add(id, newProduct);
    id;
  };

  public shared ({ caller }) func updateProduct(id : ProductId, productData : NewProductFields) : async () {
    switch (products.get(id)) {
      case (null) { Runtime.trap("Product not found") };
      case (_) {
        let updatedProduct : Product = {
          id;
          name = productData.name;
          loadingTime = productData.loadingTime;
          unloadingTime = productData.unloadingTime;
          piecesPerCycle = productData.piecesPerCycle;
          cycleTime = productData.cycleTime;
        };
        products.add(id, updatedProduct);
      };
    };
  };

  public shared ({ caller }) func deleteProduct(id : ProductId) : async () {
    products.remove(id);
  };

  //////////////////////////////
  // Machine Management       //
  //////////////////////////////
  public shared ({ caller }) func addMachine(fields : NewMachineFields) : async () {
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
    machines.remove(id);
  };

  ///////////////////////////////
  // Operator Management       //
  //////////////////////////////
  public shared ({ caller }) func addOperator(fields : NewOperatorFields) : async () {
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
    operators.remove(id);
  };

  ///////////////////////////////
  // Production Entries        //
  /////////////////////////////

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

    let dutyTime = calculateAdjustedDutyTime(punchIn, punchOut);
    let dutyTimeSeconds = convertTimeIntervalToSeconds(dutyTime);
    let totalOperatorHours = calculateTotalOperatorHoursWithDowntime(
      dutyTimeSeconds,
      quantityProduced,
      tenHourTarget,
      twelveHourTarget,
      downtimeInSeconds,
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

  // Implement the new method deleteProductionEntry
  public shared ({ caller }) func deleteProductionEntry(entryId : EntryId) : async () {
    entries.remove(entryId);
  };

  func calculateTenHourTarget(formCycleTimeSeconds : Nat, loadingTime : Nat, unloadingTime : Nat) : Nat {
    let productiveTimeInSeconds : Float = 32490.0; // 9.5 hours * 0.95
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
    let productiveTimeInSeconds : Float = 37620.0; // 11 hours * 0.95
    let totalCycleTime = formCycleTimeSeconds + loadingTime + unloadingTime;

    if (totalCycleTime == 0) {
      return 0;
    };

    let totalTimeAsFloat : Float = Int.fromNat(totalCycleTime).toFloat();
    let targetFloat : Float = productiveTimeInSeconds / totalTimeAsFloat;
    let rounded = Float.nearest(targetFloat);
    Int.abs(rounded.toInt());
  };

  func calculateAdjustedDutyTime(punchIn : Int, punchOut : Int) : {
    hours : Nat;
    minutes : Nat;
    seconds : Nat;
  } {
    func secondsToHMS(totalSeconds : Int) : {
      hours : Nat;
      minutes : Nat;
      seconds : Nat;
    } {
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
  ) : {
    hours : Nat;
    minutes : Nat;
    seconds : Nat;
  } {
    var targetHours : Nat = 10;
    if (dutyTimeSeconds >= 43200) {
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

  func convertTimeIntervalToSeconds(interval : { hours : Nat; minutes : Nat; seconds : Nat }) : Nat {
    (interval.hours * 3600) + (interval.minutes * 60) + interval.seconds;
  };

  func calculateTotalOperatorHoursWithDowntime(
    dutyTimeSeconds : Nat,
    quantityProduced : Nat,
    tenHourTarget : Nat,
    twelveHourTarget : Nat,
    downtimeSeconds : Nat,
  ) : { hours : Nat; minutes : Nat; seconds : Nat } {
    let baseHours = calculateTotalOperatorHours(
      dutyTimeSeconds,
      quantityProduced,
      tenHourTarget,
      twelveHourTarget,
    );
    let baseSeconds = convertTimeIntervalToSeconds(baseHours);
    let totalSeconds = baseSeconds + downtimeSeconds;
    {
      hours = totalSeconds / 3600;
      minutes = (totalSeconds % 3600) / 60;
      seconds = totalSeconds % 60;
    };
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

  public query func getAllMachines() : async [Machine] {
    machines.values().toArray();
  };

  public query func getAllMachinesSortedByName() : async [Machine] {
    machines.values().toArray().sort(Machine.compareByName);
  };

  public query func getAllOperators() : async [Operator] {
    operators.values().toArray();
  };

  public query func getAllOperatorsSortedByName() : async [Operator] {
    operators.values().toArray().sort(Operator.compareByName);
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
