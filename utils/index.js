const getDate = () => {
    var dateObj = new Date();
    var month = dateObj.getUTCMonth() + 1; //months from 1-12
    var day = dateObj.getUTCDate();
    var year = dateObj.getUTCFullYear();
   year + "/" + month + "/" + day;
    return year + "/" + month + "/" + day;
}
module.exports =  { 
    getDate
}