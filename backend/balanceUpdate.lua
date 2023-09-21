local balance = tonumber(redis.call('GET', KEYS[1]));
local charge = tonumber(ARGV[1])
if charge > balance then
    return {balance, 0}
end;
redis.call('SET', KEYS[1], balance - charge);
return {balance - charge, 1};
