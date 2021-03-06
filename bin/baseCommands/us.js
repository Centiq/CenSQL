
var UserViewCommandHandler = function(){
	this.includeInAudit = false;
}

UserViewCommandHandler.prototype.run = function(command, cParts, conn, screen, callback){

	conn.exec("conn", "SELECT USER_ID, USER_NAME, USER_DEACTIVATED, LAST_SUCCESSFUL_CONNECT, PASSWORD_CHANGE_NEEDED FROM SYS.USERS", function(err, data) {
	    callback([err == null ? 0 : 1, err == null ? data : err, err == null ? "default" : "sql-error"]);
	})
}

module.exports = UserViewCommandHandler;