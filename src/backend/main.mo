import Outcall "http-outcalls/outcall";
import Nat "mo:core/Nat";
import Text "mo:core/Text";

actor {
  // ── Persisted settings ────────────────────────────────────────────────────
  var scriptUrl : Text = "";
  var schemeOptions : Text = "[\"3000\",\"5000\",\"10000\",\"15000\"]";
  var defaultGiftCardAmount : Text = "11000";

  // Helper function for the HTTP transform callback
  public query func transform(input : Outcall.TransformationInput) : async Outcall.TransformationOutput {
    Outcall.transform(input);
  };

  // ── Settings: get all three in one call ───────────────────────────────────
  public query func getSettings() : async (Text, Text, Text) {
    (scriptUrl, schemeOptions, defaultGiftCardAmount);
  };

  // ── Settings: save all three in one call ──────────────────────────────────
  public func saveSettings(url : Text, opts : Text, giftCard : Text) : async () {
    scriptUrl := url;
    schemeOptions := opts;
    defaultGiftCardAmount := giftCard;
  };

  // ── Legacy individual getters/setters (kept for compatibility) ────────────
  public func setScriptUrl(url : Text) : async () {
    scriptUrl := url;
  };

  public query func getScriptUrl() : async Text {
    scriptUrl;
  };

  // Fetch customer by mobile number and rank
  public func fetchCustomer(mobileNumber : Text, rank : Nat) : async Text {
    if (scriptUrl == "") {
      return "{\"error\":\"Apps Script URL not configured\"}";
    };
    let url = scriptUrl # "?action=fetch&mobile=" # mobileNumber # "&rank=" # rank.toText();
    await Outcall.httpGetRequest(url, [], transform);
  };

  // Save/update customer record
  public func updateCustomer(jsonBody : Text) : async Text {
    if (scriptUrl == "") {
      return "{\"error\":\"Apps Script URL not configured\"}";
    };
    let encoded = encodeURIComponent(jsonBody);
    let url = scriptUrl # "?action=save&data=" # encoded;
    await Outcall.httpGetRequest(url, [], transform);
  };

  // URL-encode a string so it can be safely passed as a query parameter
  private func encodeURIComponent(text : Text) : Text {
    var result = "";
    for (c in text.chars()) {
      let ch = Text.fromChar(c);
      if (
        (c >= 'A' and c <= 'Z') or
        (c >= 'a' and c <= 'z') or
        (c >= '0' and c <= '9') or
        ch == "-" or ch == "_" or ch == "." or ch == "!" or
        ch == "~" or ch == "*" or ch == "'" or ch == "(" or ch == ")"
      ) {
        result #= ch;
      } else if (ch == " ") {
        result #= "+";
      } else {
        let bytes = ch.encodeUtf8().toArray();
        for (b in bytes.vals()) {
          result #= "%" # natToHex2(b.toNat());
        };
      };
    };
    result;
  };

  private func natToHex2(n : Nat) : Text {
    let hexChars = ["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F"];
    let hi = n / 16;
    let lo = n % 16;
    hexChars[hi] # hexChars[lo];
  };
};
