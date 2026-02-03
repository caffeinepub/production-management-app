import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";

module {
  type OldActor = {
    userProfiles : Map.Map<Principal, { name : Text; role : Text }>;
    products : Map.Map<Nat, {
      id : Nat;
      name : Text;
      loadingTime : Nat;
      unloadingTime : Nat;
      piecesPerCycle : Nat;
      cycleTime : Nat;
    }>;
    nextProductId : Nat;
    machines : Map.Map<Nat, { id : Nat; name : Text }>;
    nextMachineId : Nat;
    operators : Map.Map<Nat, { id : Nat; name : Text }>;
    nextOperatorId : Nat;
    entries : Map.Map<Nat, {
      id : Nat;
      timestamp : Int;
      machineId : Nat;
      operatorId : Nat;
      productId : Nat;
      cycleTime : { minutes : Nat; seconds : Nat };
      quantityProduced : Nat;
      numberOfPartsProduced : Nat;
      totalRunTime : { hours : Nat; minutes : Nat; seconds : Nat };
      downtimeReason : Text;
      downtimeTime : { minutes : Nat; seconds : Nat };
      punchIn : Int;
      punchOut : Int;
      dutyTime : { hours : Nat; minutes : Nat; seconds : Nat };
      tenHourTarget : Nat;
      twelveHourTarget : Nat;
      totalOperatorHours : { hours : Nat; minutes : Nat; seconds : Nat };
    }>;
    nextEntryId : Nat;
  };

  public func run(old : OldActor) : OldActor {
    old;
  };
};
