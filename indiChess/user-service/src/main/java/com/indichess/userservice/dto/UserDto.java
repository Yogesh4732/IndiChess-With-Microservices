package com.indichess.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class UserDto {

    private final Long id;
    private final String name;
    private final String email;
}
